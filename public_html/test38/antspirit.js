/**
 * @constructor
 * @extends {Spirit}
 */
function AntSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = PlayScreen.SpiritType.ANT;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;

  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.scanVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
AntSpirit.prototype = new Spirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 1;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir"
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

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist) {
  return this.playScreen.scan(PlayScreen.Group.ROCK, pos, this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist));
};

AntSpirit.prototype.onTimeout = function(world, event) {
  var body = this.getBody(world);
  var pos = body.getPosAtTime(world.now, this.tempBodyPos);
  var basicThrust = 0.1;
  var thrust = basicThrust;
  var friction = 0.1;
  this.dir += 0.1 * (Math.random() - 0.5);

  var antennaRot = Math.PI / 3;
  var scanDist = body.rad * 2;
  var turn = 0;
  var dist;
  dist = this.scan(pos, -antennaRot * Math.random(), scanDist);
  if (dist >= 0) {
    turn += Math.random();
    thrust -= basicThrust * 0.6;
  }
  dist = this.scan(pos, antennaRot * Math.random(), scanDist);
  if (dist >= 0) {
    turn -= Math.random();
    thrust -= basicThrust * 0.6;
  }
  this.dir += turn;
  var newVel = this.vec2d
    .set(body.vel).scale(1 - friction)
    .addXY(Math.sin(this.dir) * thrust, Math.cos(this.dir) * thrust);
  body.setVelAtTime(newVel, world.now);
  world.addTimeout(world.now + AntSpirit.MEASURE_TIMEOUT * (Math.random() + 0.5), this.id, -1);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

AntSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
