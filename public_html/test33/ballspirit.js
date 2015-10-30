/**
 * @constructor
 * @extends {Spirit}
 */
function BallSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.color = new Vec4();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
BallSpirit.prototype = new Spirit();
BallSpirit.prototype.constructor = BallSpirit;

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
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

BallSpirit.prototype.onTimeout = function(world, timeout) {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BallSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
