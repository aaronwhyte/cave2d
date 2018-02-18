/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ShotgunSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.SHOTGUN;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.viewportsFromCamera = 0;

  this.lastFireTime = 0;
  this.waitingForFireTimeout = false;
}
ShotgunSpirit.prototype = new BaseSpirit();
ShotgunSpirit.prototype.constructor = ShotgunSpirit;

ShotgunSpirit.FRICTION_TIMEOUT_ID = 1;
ShotgunSpirit.FIRE_TIMEOUT_ID = 2;

ShotgunSpirit.FRICTION_TIMEOUT = 1.2;
ShotgunSpirit.MAX_TIMEOUT = 10;

ShotgunSpirit.FIRE_TIMEOUT = 25;

ShotgunSpirit.SCHEMA = {
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
ShotgunSpirit.prototype.isActivatable = function() {
  return true;
};

ShotgunSpirit.getJsoner = function() {
  if (!ShotgunSpirit.jsoner) {
    ShotgunSpirit.jsoner = new Jsoner(ShotgunSpirit.SCHEMA);
  }
  return ShotgunSpirit.jsoner;
};

ShotgunSpirit.prototype.toJSON = function() {
  return ShotgunSpirit.getJsoner().toJSON(this);
};

ShotgunSpirit.prototype.setFromJSON = function(json) {
  ShotgunSpirit.getJsoner().setFromJSON(json, this);
};

ShotgunSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new ShotgunSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.25;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.7;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, ShotgunSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

ShotgunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  let now = this.now();

  if (timeoutVal === ShotgunSpirit.FRICTION_TIMEOUT_ID) {
    this.maybeStop();
    let body = this.getBody();
    let friction = this.getFriction();
    let time = ShotgunSpirit.FRICTION_TIMEOUT;

    // friction
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);

    let newVel = this.vec2d.set(body.vel);

    let oldAngVelMag = Math.abs(this.getBodyAngVel());
    if (oldAngVelMag && oldAngVelMag < ShotgunSpirit.STOPPING_ANGVEL) {
      this.setBodyAngVel(0);
    }
    let oldVelMagSq = newVel.magnitudeSquared();
    if (oldVelMagSq && oldVelMagSq < ShotgunSpirit.STOPPING_SPEED_SQUARED) {
      newVel.reset();
    }

    // Reset the body's pathDurationMax because it gets changed at compile-time,
    // but it is serialized at level-save-time, so old saved values might not
    // match the new compiled-in values. Hm.
    let timeoutDuration = Math.min(
        ShotgunSpirit.MAX_TIMEOUT,
        ShotgunSpirit.FRICTION_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
    body.pathDurationMax = timeoutDuration * 1.1;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    world.addTimeout(now + timeoutDuration, this.id, ShotgunSpirit.FRICTION_TIMEOUT_ID);

  } else if (timeoutVal === ShotgunSpirit.FIRE_TIMEOUT_ID) {
    if (this.sumOfInputs() > 0) {
      this.fire();
      this.screen.world.addTimeout(this.lastFireTime + ShotgunSpirit.FIRE_TIMEOUT, this.id, ShotgunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true; // no-op since it must already be true
    } else {
      this.waitingForFireTimeout = false;
    }
  }
};

ShotgunSpirit.prototype.getColor = function() {
  let lit = this.sumOfInputs() > 0;
  this.vec4.set(this.color);
  if (lit) {
    this.vec4.scale1(1.2);
  }
  return this.vec4;
};

ShotgunSpirit.prototype.getModelId = function() {
  return ModelIds.SHOTGUN;
};

ShotgunSpirit.prototype.onInputSumUpdate = function() {
  if (this.sumOfInputs() > 0) {
    let now = this.now();
    if (this.lastFireTime + ShotgunSpirit.FIRE_TIMEOUT <= now) {
      this.fire();
    }
    if (!this.waitingForFireTimeout) {
      this.screen.world.addTimeout(this.lastFireTime + ShotgunSpirit.FIRE_TIMEOUT, this.id, ShotgunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true;
    }
  }
};

ShotgunSpirit.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;
  let angPos = this.getBodyAngPos();
  let speed = 2;
  let baseVel = this.vec2d.setXY(0, 1).rot(angPos).scaleToLength(speed);
  let rad = 0.45;
  let vel = Vec2d.alloc();
  let bullet;
  for (let i = -3; i <= 3; i++) {
    let dist = 17 + Math.random() - Math.pow(Math.abs(i) / 3, 2);
    let rot = 0.09 * (i + 0.5 * (Math.random() - 0.5));
    vel.set(baseVel).rot(rot);
    bullet = this.screen.getSpiritById(this.addBullet(pos, angPos + rot, vel, rad, dist / speed));
    // For now, only players can fire weapons.
    bullet.team = Team.PLAYER;
  }
  this.addBodyVel(vel.setXY(0, -7 * bullet.getBody().mass / this.getBody().mass).rot(angPos));
  vel.free();

  this.lastFireTime = this.now();
  this.screen.sounds.shotgun(pos);
  this.screen.splashes.addDotSplash(this.now(),
      this.vec2d2.set(baseVel).scaleToLength(this.getBody().rad * 2).add(pos),
      rad * 4, 1.5,
      1, 0.9, 0.9);
};

ShotgunSpirit.prototype.addBullet = function(pos, angPos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.damage = 0.75;
  spirit.toughness = 1;
  spirit.trailDuration = 0.7;
  spirit.setColorRGB(1, 1, 0.5);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setAngPosAtTime(angPos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.screen.getHitGroups().PLAYER_FIRE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration * 1.01;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

