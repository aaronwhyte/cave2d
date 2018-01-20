/**
 * @constructor
 * @extends {BaseSpirit}
 */
function RogueGunSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.ROGUE_GUN;
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
RogueGunSpirit.prototype = new BaseSpirit();
RogueGunSpirit.prototype.constructor = RogueGunSpirit;

RogueGunSpirit.FRICTION_TIMEOUT_ID = 1;
RogueGunSpirit.FIRE_TIMEOUT_ID = 2;

RogueGunSpirit.FRICTION_TIMEOUT = 1.2;
RogueGunSpirit.MAX_TIMEOUT = 10;

RogueGunSpirit.FIRE_TIMEOUT = 2.81;

RogueGunSpirit.SCHEMA = {
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
RogueGunSpirit.prototype.isActivatable = function() {
  return true;
};

RogueGunSpirit.getJsoner = function() {
  if (!RogueGunSpirit.jsoner) {
    RogueGunSpirit.jsoner = new Jsoner(RogueGunSpirit.SCHEMA);
  }
  return RogueGunSpirit.jsoner;
};

RogueGunSpirit.prototype.toJSON = function() {
  return RogueGunSpirit.getJsoner().toJSON(this);
};

RogueGunSpirit.prototype.setFromJSON = function(json) {
  RogueGunSpirit.getJsoner().setFromJSON(json, this);
};

RogueGunSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

RogueGunSpirit.createModel = function() {
  var model = new RigidModel();
  var body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
  var thick = 0.4;
  var barrel = RigidModel.createSquare()
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
      .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
      .addRigidModel(RigidModel.createCircle(9)
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
      .setColorRGB(0.5, 1, 1);
  return model.addRigidModel(body).addRigidModel(barrel);
};

RogueGunSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new RogueGunSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.25;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.65;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, RogueGunSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

RogueGunSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

RogueGunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var now = this.now();

  if (timeoutVal === RogueGunSpirit.FRICTION_TIMEOUT_ID) {
    this.maybeStop();
    var body = this.getBody();
    var friction = this.getFriction();
    var time = RogueGunSpirit.FRICTION_TIMEOUT;

    // friction
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);

    var newVel = this.vec2d.set(body.vel);

    // Reset the body's pathDurationMax because it gets changed at compile-time,
    // but it is serialized at level-save-time, so old saved values might not
    // match the new compiled-in values. Hm.
    var timeoutDuration = Math.min(
        RogueGunSpirit.MAX_TIMEOUT,
        RogueGunSpirit.FRICTION_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
    body.pathDurationMax = timeoutDuration * 1.1;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    world.addTimeout(now + timeoutDuration, this.id, RogueGunSpirit.FRICTION_TIMEOUT_ID);

  } else if (timeoutVal === RogueGunSpirit.FIRE_TIMEOUT_ID) {
    if (this.sumOfInputs() > 0) {
      this.fire();
      this.screen.world.addTimeout(this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT, this.id, RogueGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true; // no-op since it must already be true
    } else {
      this.waitingForFireTimeout = false;
    }
  }
};

RogueGunSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (this.viewportsFromCamera < 1.1) {
    var lit = this.sumOfInputs() > 0;
    this.vec4.set(this.color);
    if (lit) {
      this.vec4.scale1(1.2);
    }
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    this.batchDrawer.batchDraw(this.vec4, this.modelMatrix, null);
  }
};

RogueGunSpirit.prototype.onInputSumUpdate = function() {
  if (this.sumOfInputs() > 0) {
    var now = this.now();
    if (this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT <= now) {
      this.fire();
    }
    if (!this.waitingForFireTimeout) {
      this.screen.world.addTimeout(this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT, this.id, RogueGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true;
    }
  }
};

RogueGunSpirit.prototype.fire = function() {
  var pos = this.getBodyPos();
  if (!pos) return;
  var angPos = this.getBodyAngPos();
  var speed = 2.25;
  var dist = 18 * (1 + Math.random() * 0.2);

  var rand = Math.random() - Math.random();
  var vel = this.vec2d.setXY(0, 1).rot(angPos + 0.3 * rand).scaleToLength(speed);

  var rad = 0.4;
  var bullet = this.screen.getSpiritById(this.addBullet(pos, angPos, vel, rad, dist / speed));

  // For now, only players can fire weapons.
  bullet.team = Team.PLAYER;

  this.lastFireTime = this.now();
  this.screen.sounds.bwip(pos, this.lastFireTime);
  this.screen.splashes.addDotSplash(this.now(),
      this.vec2d2.set(vel).scaleToLength(this.getBody().rad * 1.5).add(pos),
      rad * 2.5, 0.7,
      0, 1, 1);

  this.addBodyVel(vel.scale(-1 * 0.25 * bullet.getBody().mass / this.getBody().mass));
};

RogueGunSpirit.prototype.addBullet = function(pos, angPos, vel, rad, duration) {
  var now = this.now();
  var spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(0.5, 1, 1);
  spirit.damage = 0.334;
  spirit.toughness = 1.5;
  spirit.trailDuration = 1.5;
  var density = 0.5;

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

