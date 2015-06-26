/**
 * @constructor
 * @extends {Spirit}
 */
function BallSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.color = new Vec4();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.rotY = 2 * Math.PI * Math.random();
  this.rotX = 2 * Math.PI * Math.random();
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
  body.setVelAtTime(body.vel.scale(0.999), world.now);
  this.rotX -= 2 * body.vel.y/(Math.PI * body.rad);
  this.rotY -= 2 * body.vel.x/(Math.PI * body.rad);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 2))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 2))
      .multiply(this.mat44.toRotateYOp(this.rotY))
      .multiply(this.mat44.toRotateXOp(this.rotX));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

BallSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
