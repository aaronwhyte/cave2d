/**
 * @constructor
 * @extends {BaseSpirit}
 */
function FloaterSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game6Key.FLOATER;
  this.team = Team.ENEMY;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.accel = new Vec2d();

  this.distOutsideVisibleWorld = 0;

  this.nearbyPx = null;
  this.pxScans = 0;
}
FloaterSpirit.prototype = new BaseSpirit();
FloaterSpirit.prototype.constructor = FloaterSpirit;

FloaterSpirit.ACTIVE_TIMEOUT = 3.1;

FloaterSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
FloaterSpirit.STOPPING_ANGVEL = 0.01;

// Sleep when this many rads away from a player view bubble.
FloaterSpirit.SLEEP_RADS = 15;

// Wake up with this many rads away from a player view bubble.
FloaterSpirit.WAKE_RADS = 10;

FloaterSpirit.ELASTICITY = 0.7;

FloaterSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

FloaterSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new FloaterSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 1;
  b.elasticity = FloaterSpirit.ELASTICITY;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.95;
  b.hitGroup = screen.getHitGroups().ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

/**
 * @override
 * @returns {number}
 */
FloaterSpirit.prototype.getActiveTimeout = function() {
  return FloaterSpirit.ACTIVE_TIMEOUT;
};

/**
 * @override
 */
FloaterSpirit.prototype.doPlayingActiveTimeout = function() {
  this.lastControlTime = this.now();

  let body = this.getBody();
  body.elasticity = FloaterSpirit.ELASTICITY;
  this.distOutsideVisibleWorld = this.screen.distOutsideVisibleWorld(this.getBodyPos());
  this.accel.reset();

  if (!this.getStun()) {
    this.grounded = false;
  }

  if (this.distOutsideVisibleWorld < body.rad * FloaterSpirit.SLEEP_RADS) {
    // Close enough to what the players see: look busy!
    let dg = this.screen.distGrid;
    let px = dg.getPixelAtWorldVec(this.getBodyPos());
    if (px) {
      this.nearbyPx = px;
      if (this.getStun()) {
        this.activeStunnedOnPixel(dg, px);
      } else {
        this.activeOnAPixel(dg, px);
      }
    } else {
      this.activeOffPixel(dg);
    }
  } else {
    // Slow down, and maybe stop and switch to the passive timeout cycle.
    this.activeBrakesOnly();
  }
};

/**
 * The spirit is active and on a DistGrid pixel, so do active biz (accel, friction, new timeout).
 * Either relax near the target dist, or go up to target dist, or walk along the nearest wall, or head (down)
 * towards the target dist
 * @param {DistGrid} dg
 * @param {DistPixel} px
 */
FloaterSpirit.prototype.activeOnAPixel = function(dg, px) {
  let targetHeight = 9;
  let relaxWhenWithinDist = 1.5;
  let friction = this.getFriction();

  // distAboveTarget represents the spirit's world distance above the target band.
  // It is zero when within +-relaxWithinDist of targetHeight,
  // positive when too far from the ground,
  // and negative when too close to the ground.
  let distAboveTarget = px.pixelDist * dg.pixelSize - targetHeight;
  if (Math.abs(distAboveTarget) < relaxWhenWithinDist) {
    distAboveTarget = 0;
  } else {
    distAboveTarget -= Math.sign(distAboveTarget) * relaxWhenWithinDist;
  }

  if (distAboveTarget < 0) {
    // Is there an obvious climb to the target dist?
    let stepPx = dg.getStepFromPxToWorldDist(px, targetHeight - relaxWhenWithinDist - px.pixelDist * dg.pixelSize);
    if (stepPx) {
      // climbing
      let accelMagToGround = distAboveTarget * 0.03;
      this.accel.add(px.getPixelToGround(this.vec2d).scaleToLength(accelMagToGround));
      this.accel.add(this.vec2d.setXY(0, 0.01).rot(this.getBodyAngPos() + Math.random() - 0.5));
      this.addBodyAngVel(0.03 * (Math.random() - 0.5));
    } else {
      // Rolling. No obvious climb.
      // But go in the direction we're already going, which is what...
      let clockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(-Math.PI * 0.5));
      let counterClockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(Math.PI * 0.5));
      let turnSign = clockwiseDist < counterClockwiseDist ? 1 : -1;
      px.getPixelToGround(this.accel).rot(-turnSign * Math.PI * 0.55).scaleToLength(0.08);
      this.addBodyAngVel(turnSign * 0.03);
      friction = 0.3;
    }
  } else {
    // Floating
    // Follow ground contour
    let clockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(-Math.PI * 0.5));
    let counterClockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(Math.PI * 0.5));
    let turnSign = clockwiseDist < counterClockwiseDist ? 1 : -1;
    px.getPixelToGround(this.accel).rot(-turnSign * Math.PI * 0.5).scaleToLength(0.02);

    // Maintain height
    let accelMagToGround = distAboveTarget * 0.03;
    this.accel.add(px.getPixelToGround(this.vec2d).scaleToLength(accelMagToGround));

    // Turn and move "forward" a bit too.
    this.addBodyAngVel(0.002 * turnSign);
    this.accel.add(this.vec2d.setXY(0, 0.01).rot(this.getBodyAngPos()));
  }
  this.activeFrictionAndAccel(friction, this.accel);
};

FloaterSpirit.prototype.explode = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.screen.splashes.addEnemyExplosion(
      this.now(), pos, body.rad, this.vec4.setXYZ(0.1, 0.8 + Math.random() * 0.2, 0.1));
  this.screen.sounds.antExplode(pos);
};

FloaterSpirit.prototype.die = function() {
  this.explode();
  if (this.weapon) {
    this.weapon.die();
  }
  if (this.targetScanner) {
    this.targetScanner.die();
  }
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

FloaterSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  if (this.distOutsideVisibleWorld < this.getBody().rad * FloaterSpirit.WAKE_RADS) {
    this.maybeWake();
  }
};

FloaterSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? 0.07 : 0.3;
};
