/**
 * @constructor
 * @extends {BaseSpirit}
 */
function AntSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = BaseScreen.SpiritType.ANT;
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

  this.lastControlTime = this.screen.now();
  this.viewportsFromCamera = 0;

  // So I don't need to delete and re-add ants whenever I change their max health,
  // normalize health to be a fraction, between 0 and 1.
  this.health = 1;
}
AntSpirit.prototype = new BaseSpirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 1.2;
AntSpirit.THRUST = 0.5;
AntSpirit.TWIST = 0.1;
AntSpirit.MAX_TIMEOUT = 10;
AntSpirit.LOW_POWER_VIEWPORTS_AWAY = 2;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.MAX_HEALTH = 3;
AntSpirit.OPTIMIZE = true;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "stress",
  5: "health"
};

AntSpirit.getJsoner = function() {
  if (!AntSpirit.jsoner) {
    AntSpirit.jsoner = new Jsoner(AntSpirit.SCHEMA);
  }
  return AntSpirit.jsoner;
};

AntSpirit.prototype.toJSON = function() {
  return AntSpirit.getJsoner().toJSON(this);
};

AntSpirit.prototype.setFromJSON = function(json) {
  AntSpirit.getJsoner().setFromJSON(json, this);
};

AntSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

AntSpirit.createModel = function() {
  return RigidModel.createCircle(17)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
      .setColorRGB(0.2, 0.5, 1);
};

AntSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new AntSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.9;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.setVelAtTime((new Vec2d(0, 0.4)).rot(dir), screen.now());
  b.rad = 0.7 + Math.random();
  b.hitGroup = BaseScreen.Group.ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 1.1;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  var dir = this.getBodyAngPos();
  return this.screen.scan(
      BaseScreen.Group.ENEMY_SCAN,
      pos,
      this.scanVec.setXY(
          Math.sin(dir + rot) * dist,
          Math.cos(dir + rot) * dist),
      rad,
      this.scanResp);
};

AntSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var dir = this.getBodyAngPos();
  var angVel = this.getBodyAngVel();

  this.stress = this.stress || 0;

  var friction = 0;//0.05;
  var traction = 0.05;

  var now = this.now();
  var time = Math.min(AntSpirit.MEASURE_TIMEOUT, now - this.lastControlTime);
  this.lastControlTime = now;

  var newVel = this.vec2d.set(body.vel);

  // friction
  this.accel.set(newVel).scale(-friction * time);
  newVel.add(this.accel);
  angVel *= (1 - friction * time);
  if (AntSpirit.OPTIMIZE && newVel.magnitudeSquared() < AntSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  if (false && this.screen.isPlaying()) {
    if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < AntSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      this.accel.set(body.vel).scale(-traction * time);
      newVel.add(this.accel);
      var antennaRotMag = Math.max(Math.PI * 0.13, Math.PI * this.stress);
      var scanDist = body.rad * 2;
      var scanRot = 2 * antennaRotMag * (Math.random() - 0.5);
      var dist = this.scan(pos, scanRot, scanDist, body.rad);
      var angAccel = 0;
      // they get faster as they get hurt
      var thrust = AntSpirit.THRUST;
      if (dist >= 0) {
        // avoid obstruction
        angAccel = -scanRot * (this.stress * 0.8 + 0.2) * AntSpirit.TWIST;
        this.stress += 0.03;
        thrust -= thrust * (dist/scanDist);
      } else {
        // clear path
        this.stress = Math.max(0, this.stress - 0.1);
        angAccel = scanRot * (this.stress * 0.8 + 0.2) * AntSpirit.TWIST;
      }
      this.stress = Math.min(1, Math.max(0, this.stress));
      angAccel -= angVel * 0.1;

      angVel += angAccel;

      dir += angVel;
      this.accel.setXY(Math.sin(dir), Math.cos(dir))
          .scale(thrust * traction * time);
      newVel.add(this.accel);
    }
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  if (AntSpirit.OPTIMIZE) {
    timeoutDuration = Math.min(
        AntSpirit.MAX_TIMEOUT,
        Math.max(this.health, 0.3) *
            AntSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera));
  } else {
    timeoutDuration = AntSpirit.MEASURE_TIMEOUT * (1 - Math.random() * 0.05);
  }
  body.pathDurationMax = timeoutDuration * 1.1;
  this.setBodyVel(newVel);
  this.setBodyAngVel(angVel);

  world.addTimeout(now + timeoutDuration, this.id, -1);
};

AntSpirit.prototype.getScanHitSpirit = function() {
  var body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};
