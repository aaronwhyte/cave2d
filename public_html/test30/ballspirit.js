/**
 * @constructor
 * @extends {Spirit}
 */
function BallSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.multiPointer = null;
  this.modelStamp = null;

  this.color = new Vec4();

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
BallSpirit.prototype = new Spirit();
BallSpirit.prototype.constructor = BallSpirit;

BallSpirit.prototype.setMultiPointer = function(multiPointer) {
  this.multiPointer = multiPointer;
};

BallSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BallSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  this.color.setXYZ(1, 1, 1);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 3))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 4))
      .multiply(this.mat44.toRotateXOp(-world.now / 200));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

BallSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
