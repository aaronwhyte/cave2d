/**
 * @constructor
 * @extends {Spirit}
 */
function BallSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;

  this.type = PlayScreen.SpiritType.BALL;
  this.id = -1;
  this.bodyId = -1;
  this.modelStamp = null;
  this.color = new Vec4();

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
BallSpirit.prototype = new Spirit();
BallSpirit.prototype.constructor = BallSpirit;

BallSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

BallSpirit.getJsoner = function() {
  if (!BallSpirit.jsoner) {
    BallSpirit.jsoner = new Jsoner(BallSpirit.SCHEMA);
  }
  return BallSpirit.jsoner;
};

BallSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BallSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BallSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  // Render the smaller ones in front.
  // TODO: standardize Z
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -1 + Math.max(0, body.rad / 100)))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

BallSpirit.prototype.onTimeout = function(world, timeoutVal) {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BallSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};


BallSpirit.prototype.toJSON = function() {
  return BallSpirit.getJsoner().toJSON(this);
};

BallSpirit.prototype.setFromJSON = function(json) {
  BallSpirit.getJsoner().setFromJSON(json, this);
};

