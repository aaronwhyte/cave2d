/**
 * @constructor
 * @extends {Spirit}
 */
function WallSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.color = new Vec4(0, 0.7, 2);

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
WallSpirit.prototype = new Spirit();
WallSpirit.prototype.constructor = WallSpirit;

WallSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

WallSpirit.prototype.onDraw = function(world, renderer) {
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  var b = world.bodies[this.bodyId];
  b.getPosAtTime(world.now, this.vec2d);
  this.modelMatrix.toTranslateOpXYZ(this.vec2d.x, this.vec2d.y, 0);
  this.modelMatrix.multiply(this.mat44.toScaleOpXYZ(b.rectRad.x, b.rectRad.y, 1));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};
