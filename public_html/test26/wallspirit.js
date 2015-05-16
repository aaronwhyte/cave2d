/**
 * @constructor
 * @extends {Spirit}
 */
function WallSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  var r = Math.random() * 0.1 + 0.3;
  this.color = new Vec4(r, r, r);
}
WallSpirit.prototype = new Spirit();
WallSpirit.prototype.constructor = WallSpirit;

WallSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  return Fracas2.Reaction.BOUNCE;
};

WallSpirit.prototype.onDraw = function(world, renderer) {
  renderer
      .setStamp(stamps.cube)
      .setColorVector(this.color);
  var b = world.bodies[this.bodyId];
  b.getPosAtTime(world.now, bodyPos);
  modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
  modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rectRad.x, b.rectRad.y, 1)));
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
};
