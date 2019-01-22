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
  this.stress = 0;

  this.distOutsideVisibleWorld = 0;

  this.toughness = 1;
  this.damage = 1;
}
FloaterSpirit.prototype = new BaseSpirit();
FloaterSpirit.prototype.constructor = FloaterSpirit;

FloaterSpirit.ACTIVE_TIMEOUT = 3.1;

FloaterSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
FloaterSpirit.STOPPING_ANGVEL = 0.01;

// Sleep when this many rads away from a player view bubble.
FloaterSpirit.SLEEP_RADS = 10;

// Wake up with this many rads away from a player view bubble.
FloaterSpirit.WAKE_RADS = 2;

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

FloaterSpirit.prototype.getModelId = function() {
  return ModelId.FLOATER;
};

/**
 * @override
 */
FloaterSpirit.prototype.doPlayingActiveTimeout = function() {
  let now = this.now();
  let time = Math.max(0, Math.min(this.getActiveTimeout(), now - this.lastControlTime));
  this.lastControlTime = now;

  let body = this.getBody();
  this.distOutsideVisibleWorld = this.screen.distOutsideVisibleWorld(this.getBodyPos());

  if (this.distOutsideVisibleWorld < body.rad * FloaterSpirit.SLEEP_RADS) {
    let dg = this.screen.distGrid;
    let friction = this.getFriction();

    let px = dg.getPixelAtWorldVec(this.getBodyPos());
    if (px) {
      let targetDist = 10;
      let relaxWhenWithinDist = 2;
      let distFactor = px.pixelDist * dg.pixelSize - targetDist;
      if (Math.abs(distFactor) < relaxWhenWithinDist) {
        distFactor = 0;
      } else {
        distFactor -= Math.sign(distFactor) * relaxWhenWithinDist;
      }

      let accelMagToGround = distFactor * 0.1;
      if (accelMagToGround >= 0) {
        this.stress = 0;
      } else {
        this.stress += 1;
      }
      px.getPixelToGround(this.accel).scaleToLength(accelMagToGround);
      if (this.stress > 100) {
        // stressed!
        this.accel.scale(0.5).add(this.vec2d.setXY(0, 0.2).rot(Math.random() * 2 * Math.PI));
        this.addBodyAngVel(0.1 * time * (Math.random() - 0.5), now);
      } else {
        this.accel.add(this.vec2d.setXY(0, 0.1).rot(this.getBodyAngPos()));
        this.addBodyAngVel(0.05 * time * (Math.random() - 0.5), now);
      }
    } else {
      friction = 0.9;
    }
    // normal active biz
    // // scan for walls to make sure we're the right distance from one
    // let dir = this.getBodyAngPos() + (Math.random() - 0.5) * 2 * Math.PI; // full circle
    // let distFrac = this.scan(
    //     HitGroups.WALL_SCAN,
    //     this.getBodyPos(),
    //     dir,
    //     20,
    //     body.rad);
    //
    // if (distFrac >= 0) {
    //   let a;
    //   if (distFrac < 0.5) {
    //     a = -0.1;
    //   } else {
    //     a = 0.05 * (distFrac - 0.5);
    //   }
    // } else {
    //   this.accel.setXY(0, -0.01).rot(dir);
    // }

    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);
    let newVel = this.vec2d.set(this.getBodyVel());
    newVel.add(this.accel);
    let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
    body.pathDurationMax = timeoutDuration * 1.01;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    this.scheduleActiveTimeout(now + timeoutDuration);

  } else {
    // brakes only
    if (this.weapon) {
      this.weapon.setButtonDown(false);
    }
    let friction = this.getFriction();
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);
    let stopped = this.maybeStop();
    if (stopped) {
      // Assume the next timeout will be the passive one.
      let timeoutDuration = BaseSpirit.PASSIVE_TIMEOUT;
      body.pathDurationMax = timeoutDuration * 1.01;
      body.invalidatePath();
      // Do not schedule another active timeout.
    } else {
      // keep braking
      let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
      body.pathDurationMax = timeoutDuration * 1.01;
      body.invalidatePath();
      this.scheduleActiveTimeout(now + timeoutDuration);
    }
  }
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

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
FloaterSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  // let body = this.getBody();
  // if (!body) return;
  // let now = this.now();
  // if (this.lastThumpSoundTime + BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME < this.now()) {
  //   this.screen.sounds.wallThump(this.getBodyPos(), mag);
  // }
  // this.lastThumpSoundTime = now;

  this.maybeWake();
};

FloaterSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? 0.1 : 0.3;
};
