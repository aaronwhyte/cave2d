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
  this.viewportsFromCamera = 0;

  this.lastFireTime = 0;
  this.waitingForFireTimeout = false;
}
ActivatorGunSpirit.prototype = new BaseSpirit();
ActivatorGunSpirit.prototype.constructor = ActivatorGunSpirit;

ActivatorGunSpirit.FRICTION_TIMEOUT_ID = 1;
ActivatorGunSpirit.FIRE_TIMEOUT_ID = 2;

ActivatorGunSpirit.FRICTION_TIMEOUT = 1.2;
ActivatorGunSpirit.MAX_TIMEOUT = 10;

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

ActivatorGunSpirit.getJsoner = function() {
  if (!ActivatorGunSpirit.jsoner) {
    ActivatorGunSpirit.jsoner = new Jsoner(ActivatorGunSpirit.SCHEMA);
  }
  return ActivatorGunSpirit.jsoner;
};

ActivatorGunSpirit.prototype.toJSON = function() {
  return ActivatorGunSpirit.getJsoner().toJSON(this);
};

ActivatorGunSpirit.prototype.setFromJSON = function(json) {
  ActivatorGunSpirit.getJsoner().setFromJSON(json, this);
};

ActivatorGunSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ActivatorGunSpirit.createModel = function() {
  let model = new RigidModel();
  let body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
  let thick = 0.3;
  let barrel = RigidModel.createSquare()
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
      .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
      .addRigidModel(RigidModel.createCircle(9)
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
      .setColorRGB(0.9, 0.9, 0.9);
  return model.addRigidModel(body).addRigidModel(barrel);
};

ActivatorGunSpirit.factory = function(screen, batchDrawer, pos, dir) {
  let world = screen.world;

  let spirit = new ActivatorGunSpirit(screen);
  spirit.setBatchDrawer(batchDrawer);
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
  world.addTimeout(screen.now(), spiritId, ActivatorGunSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

ActivatorGunSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

ActivatorGunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  let now = this.now();

  if (timeoutVal === ActivatorGunSpirit.FRICTION_TIMEOUT_ID) {
    this.maybeStop();
    let body = this.getBody();
    let friction = this.getFriction();
    let time = ActivatorGunSpirit.FRICTION_TIMEOUT;

    // friction
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);

    let newVel = this.vec2d.set(body.vel);

    // Reset the body's pathDurationMax because it gets changed at compile-time,
    // but it is serialized at level-save-time, so old saved values might not
    // match the new compiled-in values. Hm.
    let timeoutDuration = Math.min(
        ActivatorGunSpirit.MAX_TIMEOUT,
        ActivatorGunSpirit.FRICTION_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
    body.pathDurationMax = timeoutDuration * 1.1;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    world.addTimeout(now + timeoutDuration, this.id, ActivatorGunSpirit.FRICTION_TIMEOUT_ID);

  } else if (timeoutVal === ActivatorGunSpirit.FIRE_TIMEOUT_ID) {
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
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

