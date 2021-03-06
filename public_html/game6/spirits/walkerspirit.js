/**
 * @constructor
 * @extends {BaseSpirit}
 */
function WalkerSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game6Key.WALKER;
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
WalkerSpirit.prototype = new BaseSpirit();
WalkerSpirit.prototype.constructor = WalkerSpirit;

WalkerSpirit.ACTIVE_TIMEOUT = 2.8;

WalkerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
WalkerSpirit.STOPPING_ANGVEL = 0.01;

// Sleep when this many rads away from a player view bubble.
WalkerSpirit.SLEEP_RADS = 15;

// Wake up with this many rads away from a player view bubble.
WalkerSpirit.WAKE_RADS = 10;

WalkerSpirit.ELASTICITY = 0.7;

WalkerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

WalkerSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new WalkerSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.25;
  b.elasticity = WalkerSpirit.ELASTICITY;
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
WalkerSpirit.prototype.getActiveTimeout = function() {
  return WalkerSpirit.ACTIVE_TIMEOUT;
};

/**
 * @override
 */
WalkerSpirit.prototype.doPlayingActiveTimeout = function() {
  this.lastControlTime = this.now();

  let body = this.getBody();
  body.elasticity = WalkerSpirit.ELASTICITY;
  this.distOutsideVisibleWorld = this.screen.distOutsideVisibleWorld(this.getBodyPos());
  this.accel.reset();

  if (!this.getStun()) {
    this.grounded = false;
  }

  if (this.distOutsideVisibleWorld < body.rad * WalkerSpirit.SLEEP_RADS) {
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
WalkerSpirit.prototype.activeOnAPixel = function(dg, px) {
  this.nearbyPx = px;
  let speed = 0.1;
  let friction = 0.25;

  let clockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(-Math.PI * 0.5));
  let counterClockwiseDist = this.getBodyVel().distanceSquared(px.getPixelToGround(this.vec2d).rot(Math.PI * 0.5));
  let turnSign = clockwiseDist < counterClockwiseDist ? 1 : -1;
  px.getPixelToGround(this.accel).rot(-turnSign * Math.PI * 0.25).scaleToLength(speed);
  this.addBodyAngVel(turnSign * speed);
  this.activeFrictionAndAccel(friction, this.accel);
};

WalkerSpirit.prototype.explode = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.screen.splashes.addEnemyExplosion(
      this.now(), pos, body.rad, this.vec4.setXYZ(0.1, 0.8 + Math.random() * 0.2, 0.1));
  this.screen.sounds.antExplode(pos);
};

WalkerSpirit.prototype.die = function() {
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

WalkerSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  if (this.distOutsideVisibleWorld < this.getBody().rad * WalkerSpirit.WAKE_RADS) {
    this.maybeWake();
  }
};

WalkerSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? 0.07 : 0.3;
};
