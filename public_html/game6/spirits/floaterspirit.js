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

  this.distOutsideViewCircles = 0;

  this.toughness = 1;
  this.damage = 1;
}
FloaterSpirit.prototype = new BaseSpirit();
FloaterSpirit.prototype.constructor = FloaterSpirit;

FloaterSpirit.ACTIVE_TIMEOUT = 1.3;

FloaterSpirit.THRUST = 1;
FloaterSpirit.TRACTION = 0.05;
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
  b.grip = 0.2;
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
  if (this.screen.isPlaying()) {
    if (!this.weapon) {
      let w = new SlowShooter(this.screen);
      this.screen.world.addSpirit(w);
      w.wield(this.id);
      this.weapon = w;
    }
    // if (!this.targetScanner) {
    //   let s = new TargetScanner(this.screen, this.team);
    //   this.screen.world.addSpirit(s);
    //   s.wield(this.id);
    //   s.coneWidth = Math.PI * 1.2;
    //   s.coneLen = 20;
    //   s.scanPeriod = 0.5;
    //   s.scanRad = 0.75;
    //   s.scanGap = 1.5;
    //   s.autoLockBreakTimeout = 60;
    //   this.targetScanner = s;
    // }
    // if (!this.clearPathScanner) {
    //   let s = new ClearPathScanner(this.screen);
    //   s.wield(this.id);
    //   this.clearPathScanner = s;
    // }
  }

  let now = this.now();
  let time = Math.max(0, Math.min(this.getActiveTimeout(), now - this.lastControlTime));
  this.lastControlTime = now;

  let body = this.getBody();
  this.distOutsideViewCircles = this.screen.distOutsideViewCircles(this.getBodyPos());
  // this.distOutsideViewCircles = this.screen.distFromViewCenter(this.getBodyPos()) - 5; // fun debugging

  if (this.distOutsideViewCircles < body.rad * FloaterSpirit.SLEEP_RADS) {
    // normal active biz
    // TODO: scan for walls to make sure we're the right distance from one
    // TODO: maintain approximate position
    // TODO: scan for player(s) to shoot at 'em
    let friction = this.getFriction();
    body.applyLinearFrictionAtTime(friction * time, now);
    let newVel = this.vec2d.set(this.getBodyVel());

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

  if (this.weapon) {
    this.screen.removeSpiritId(this.weapon.id);
  }
  if (this.targetScanner) {
    this.screen.removeSpiritId(this.targetScanner.id);
  }
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

FloaterSpirit.prototype.die = function() {
  this.explode();
};

FloaterSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  if (this.distOutsideViewCircles < this.getBody().rad * FloaterSpirit.WAKE_RADS) {
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
