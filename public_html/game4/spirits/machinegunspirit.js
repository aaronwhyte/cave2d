/**
 * @constructor
 * @extends {BaseSpirit}
 */
function MachineGunSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.MACHINE_GUN;
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
MachineGunSpirit.prototype = new BaseSpirit();
MachineGunSpirit.prototype.constructor = MachineGunSpirit;

MachineGunSpirit.FRICTION_TIMEOUT_ID = 1;
MachineGunSpirit.FIRE_TIMEOUT_ID = 2;

MachineGunSpirit.FRICTION_TIMEOUT = 1.2;
MachineGunSpirit.MAX_TIMEOUT = 10;

MachineGunSpirit.FIRE_TIMEOUT = 4;

MachineGunSpirit.SCHEMA = {
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
MachineGunSpirit.prototype.isActivatable = function() {
  return true;
};

MachineGunSpirit.getJsoner = function() {
  if (!MachineGunSpirit.jsoner) {
    MachineGunSpirit.jsoner = new Jsoner(MachineGunSpirit.SCHEMA);
  }
  return MachineGunSpirit.jsoner;
};

MachineGunSpirit.prototype.toJSON = function() {
  return MachineGunSpirit.getJsoner().toJSON(this);
};

MachineGunSpirit.prototype.setFromJSON = function(json) {
  MachineGunSpirit.getJsoner().setFromJSON(json, this);
};

MachineGunSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

MachineGunSpirit.createModel = function() {
  var model = new RigidModel();
  var body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
  var thick = 0.5;
  var barrel = RigidModel.createSquare()
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
      .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
      .addRigidModel(RigidModel.createCircle(9)
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
      .setColorRGB(1, 1, 0);
  return model.addRigidModel(body).addRigidModel(barrel);
};

MachineGunSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new MachineGunSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
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

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, MachineGunSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

MachineGunSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

MachineGunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var now = this.now();

  if (timeoutVal === MachineGunSpirit.FRICTION_TIMEOUT_ID) {
    var body = this.getBody();
    var friction = this.getFriction();
    var time = MachineGunSpirit.FRICTION_TIMEOUT;

    // friction
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);

    var newVel = this.vec2d.set(body.vel);

    var oldAngVelMag = Math.abs(this.getBodyAngVel());
    if (oldAngVelMag && oldAngVelMag < MachineGunSpirit.STOPPING_ANGVEL) {
      this.setBodyAngVel(0);
    }
    var oldVelMagSq = newVel.magnitudeSquared();
    if (oldVelMagSq && oldVelMagSq < MachineGunSpirit.STOPPING_SPEED_SQUARED) {
      newVel.reset();
    }

    // Reset the body's pathDurationMax because it gets changed at compile-time,
    // but it is serialized at level-save-time, so old saved values might not
    // match the new compiled-in values. Hm.
    var timeoutDuration = Math.min(
        MachineGunSpirit.MAX_TIMEOUT,
        MachineGunSpirit.FRICTION_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
    body.pathDurationMax = timeoutDuration * 1.1;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    world.addTimeout(now + timeoutDuration, this.id, MachineGunSpirit.FRICTION_TIMEOUT_ID);

  } else if (timeoutVal === MachineGunSpirit.FIRE_TIMEOUT_ID) {
    if (this.sumOfInputs() > 0) {
      this.fire();
      this.screen.world.addTimeout(this.lastFireTime + MachineGunSpirit.FIRE_TIMEOUT, this.id, MachineGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true; // no-op since it must already be true
    } else {
      this.waitingForFireTimeout = false;
    }
  }
};

MachineGunSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (this.viewportsFromCamera < 1.1) {
    var lit = this.sumOfInputs() > 0;
    this.vec4.set(this.color);
    if (lit) {
      this.vec4.scale1(1.2);
    }
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

MachineGunSpirit.prototype.onInputSumUpdate = function() {
  if (this.sumOfInputs() > 0) {
    var now = this.now();
    if (this.lastFireTime + MachineGunSpirit.FIRE_TIMEOUT <= now) {
      this.fire();
    }
    if (!this.waitingForFireTimeout) {
      this.screen.world.addTimeout(this.lastFireTime + MachineGunSpirit.FIRE_TIMEOUT, this.id, MachineGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true;
    }
  }
};

MachineGunSpirit.prototype.fire = function() {
  var pos = this.getBodyPos();
  if (!pos) return;
  var angPos = this.getBodyAngPos();
  var speed = 3.5;
  var dist = 30 * (1 + Math.random() * 0.2);
  var vel = this.vec2d.setXY(0, 1).rot(angPos + 0.05 * (Math.random() - 0.5)).scaleToLength(speed);
  var rad = 0.5;
  var bullet = this.screen.getSpiritById(this.addBullet(pos, angPos, vel, rad, dist / speed));

  // For now, only players can fire weapons.
  bullet.team = Team.PLAYER;

  this.lastFireTime = this.now();
  this.screen.sounds.bew(pos, this.lastFireTime);
  this.screen.splashes.addDotSplash(this.now(),
      this.vec2d2.set(vel).scaleToLength(this.getBody().rad * 1.5).add(pos),
      rad * 2.5, 0.7,
      1, 0.9, 0.9);

  this.addBodyVel(vel.scale(-1 * 0.25 * bullet.getBody().mass / this.getBody().mass));
};

MachineGunSpirit.prototype.addBullet = function(pos, angPos, vel, rad, duration) {
  var now = this.now();
  var spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(1, 1, 0.5);
  spirit.damage = 1;
  spirit.toughness = 0.5;
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setAngPosAtTime(angPos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.screen.getHitGroups().PLAYER_FIRE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration * 1.01;
  spirit.bodyId = this.screen.world.addBody(b);

  var spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

