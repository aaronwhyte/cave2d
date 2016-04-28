/**
 * @constructor
 * @extends {Spirit}
 */
function AntSpirit(screen) {
  Spirit.call(this);
  this.screen = screen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = BaseScreen.SpiritType.ANT;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;

  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.scanVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.accel = new Vec2d();
  this.stress = 0;

  this.lastControlTime = this.screen.now();

}
AntSpirit.prototype = new Spirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 1.2;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel",
  6: "stress"
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
  return RigidModel.createCircleMesh(4)
      .setColorRGB(0.5, 0, 0)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.01))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)));
};

AntSpirit.factory = function(playScreen, stamp, pos, dir) {
  var world = playScreen.world;

  var spirit = new AntSpirit(playScreen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, world.now);
  b.rad = 0.8;
  b.hitGroup = BaseScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 1.1;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  return this.screen.scan(
      BaseScreen.Group.ROCK,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad);
};

AntSpirit.prototype.onTimeout = function(world, event) {
  var body = this.getBody(world);
  var pos = body.getPosAtTime(world.now, this.tempBodyPos);
  this.stress = this.stress || 0;

  var antennaRotMag = Math.max(Math.PI * 0.1, Math.PI * this.stress);
  var scanDist = body.rad * 4;
  var basicThrust = 0.5;
  var friction = 0.05;
  var traction = 0.5;

  var now = this.screen.now();
  var time = now - this.lastControlTime;
  this.lastControlTime = now;

  var newVel = this.vec2d.set(body.vel);

  // friction
  this.accel.set(newVel).scale(-friction * time);
  newVel.add(this.accel);

  if (this.screen.isPlaying()) {
    this.accel.set(body.vel).scale(-traction * time);
    newVel.add(this.accel);

    var scanRot = 2 * antennaRotMag * (Math.random() - 0.5);
    var dist = this.scan(pos, scanRot, scanDist, body.rad);
    var turn, thrust;
    if (dist >= 0) {
      turn = 0;
      this.angVel = 0;
      this.stress += (1 - dist) * 0.15;
      this.dir -= Math.sign(scanRot) * 0.2;
      thrust = basicThrust * (1 - dist);
    } else {
      turn = 0;
      this.angVel = 0;
      this.dir += scanRot * this.stress;
      this.stress = 0;
      thrust = basicThrust;
    }
    this.stress -= 0.01;
    this.stress = Math.min(1, Math.max(0, this.stress));

    this.accel.setXY(Math.sin(this.dir), Math.cos(this.dir))
        .scale(thrust * traction * time);
    newVel.add(this.accel);
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  body.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 1.1;
  body.setVelAtTime(newVel, world.now);
  world.addTimeout(world.now + AntSpirit.MEASURE_TIMEOUT + (0.1 * (Math.random() - 0.5)), this.id, -1);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toRotateZOp(-this.dir));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

AntSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
