/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ActivatorGunSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.ACTIVATOR_GUN;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.lastFireTime = 0;
  this.waitingForFireTimeout = false;
}
ActivatorGunSpirit.prototype = new BaseSpirit();
ActivatorGunSpirit.prototype.constructor = ActivatorGunSpirit;

ActivatorGunSpirit.FIRE_TIMEOUT_ID = 2;

ActivatorGunSpirit.FIRE_TIMEOUT = 2.2;

ActivatorGunSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "lastFireTime",
  4: "waitingForFireTimeout"
};

/**
 * @override
 * @returns {boolean}
 */
ActivatorGunSpirit.prototype.isActivatable = function() {
  return true;
};

ActivatorGunSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new ActivatorGunSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.25;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.6;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

/**
 * @override
 * @param world
 * @param timeoutVal
 */
ActivatorGunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  BaseSpirit.prototype.onTimeout.call(this, world, timeoutVal);

  if (timeoutVal === ActivatorGunSpirit.FIRE_TIMEOUT_ID) {
    if (this.sumOfInputs() > 0) {
      this.fire();
      this.screen.world.addTimeout(this.lastFireTime + ActivatorGunSpirit.FIRE_TIMEOUT, this.id, ActivatorGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true; // no-op since it must already be true
    } else {
      this.waitingForFireTimeout = false;
    }
  }
};

ActivatorGunSpirit.prototype.getColor = function() {
  let lit = this.sumOfInputs() > 0;
  this.vec4.set(this.color);
  if (lit) {
    this.vec4.scale1(1.2);
  }
  return this.vec4;
};

ActivatorGunSpirit.prototype.getModelId = function() {
  return ModelId.ACTIVATOR_GUN;
};

ActivatorGunSpirit.prototype.onInputSumUpdate = function() {
  if (this.sumOfInputs() > 0) {
    let now = this.now();
    if (this.lastFireTime + ActivatorGunSpirit.FIRE_TIMEOUT <= now) {
      this.fire();
    }
    if (!this.waitingForFireTimeout) {
      this.screen.world.addTimeout(this.lastFireTime + ActivatorGunSpirit.FIRE_TIMEOUT, this.id, ActivatorGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true;
    }
  }
};

ActivatorGunSpirit.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;
  let angPos = this.getBodyAngPos();
  let speed = 3;
  let dist = 25 + Math.random() * 5;
  this.addBullet(
      pos, angPos,
      this.vec2d.setXY(0, 1).rot(angPos).scaleToLength(speed),
      0.3,
      dist / speed);

  this.lastFireTime = this.now();
  // this.screen.sounds.pew(pos, now);
};

ActivatorGunSpirit.prototype.addBullet = function(pos, angPos, vel, rad, duration) {
  let now = this.now();
  let spirit = ActivatorBulletSpirit.alloc(this.screen);
  //spirit.setModelStamp(this.stamps.arrow);
  spirit.setColorRGB(1, 1, 1);
  let density = 0;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setAngPosAtTime(angPos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.screen.getHitGroups().BEAM;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration * 1.01;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, ActivatorBulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

