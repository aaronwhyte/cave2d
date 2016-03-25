/**
 * @constructor
 * @extends {Spirit}
 */
function PlayerSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = PlayScreen.SpiritType.PLAYER;
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
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.MEASURE_TIMEOUT = 0.6;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel"
};

PlayerSpirit.getJsoner = function() {
  if (!PlayerSpirit.jsoner) {
    PlayerSpirit.jsoner = new Jsoner(PlayerSpirit.SCHEMA);
  }
  return PlayerSpirit.jsoner;
};

PlayerSpirit.prototype.toJSON = function() {
  return PlayerSpirit.getJsoner().toJSON(this);
};

PlayerSpirit.prototype.setFromJSON = function(json) {
  PlayerSpirit.getJsoner().setFromJSON(json, this);
};

PlayerSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

PlayerSpirit.createModel = function() {
  return RigidModel.createCircleMesh(4)
      .setColorRGB(1, 0.3, 0.6);
};

PlayerSpirit.factory = function(playScreen, stamp, pos, dir) {
  var world = playScreen.world;

  var spirit = new PlayerSpirit(playScreen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, world.now);
  b.rad = PlayScreen.ANT_RAD;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PlayerSpirit.MEASURE_TIMEOUT * 2;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

PlayerSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

PlayerSpirit.prototype.scan = function(pos, rot, dist, rad) {
  return this.playScreen.scan(
      PlayScreen.Group.ROCK,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad);
};

PlayerSpirit.prototype.onTimeout = function(world, event) {
  var body = this.getBody(world);
  var pos = body.getPosAtTime(world.now, this.tempBodyPos);
  var basicThrust = 0.03;
  var maxTurn = 0.07;
  var thrust = basicThrust;
  var friction = 0.08;

  var antennaRot = Math.PI / 3.5;
  var scanDist = body.rad * 5;
  var turn = 0;
  var scanRot = antennaRot * (Math.random() - 0.5);
  var dist = this.scan(pos, scanRot, scanDist, body.rad/2);
  if (dist >= 0) {
    if (scanRot > 0) {
      turn += maxTurn * (-antennaRot/2 - scanRot) * (1 - dist/2);
    } else {
      turn += maxTurn * (antennaRot/2 - scanRot) * (1 - dist/2);
    }
    thrust -= basicThrust * (1 - dist);
  }
  this.angVel *= 0.90;
  this.angVel += turn;
  if (this.angVel > Math.PI/2) this.angVel = Math.PI/2;
  if (this.angVel < -Math.PI/2) this.angVel = -Math.PI/2;
  this.dir += this.angVel;
  var newVel = this.vec2d
    .set(body.vel).scale(1 - friction)
    .addXY(Math.sin(this.dir) * thrust, Math.cos(this.dir) * thrust);
  body.setVelAtTime(newVel, world.now);
  world.addTimeout(world.now + PlayerSpirit.MEASURE_TIMEOUT * (Math.random() + 0.5), this.id, -1);
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
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

PlayerSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
