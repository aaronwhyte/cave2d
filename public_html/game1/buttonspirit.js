/**
 * @constructor
 * @extends {Spirit}
 */
function ButtonSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.color = new Vec4();
  this.lastSoundMs = 0;
  this.soundLength = 1;
  this.onClick = null;

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
ButtonSpirit.prototype = new Spirit();
ButtonSpirit.prototype.constructor = ButtonSpirit;

ButtonSpirit.POINTER_RADIUS = 0.0;

ButtonSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

/**
 * @param {function} func  A function of (e)
 */
ButtonSpirit.prototype.setOnClick = function(func) {
  this.onClick = func;
};

ButtonSpirit.prototype.onDraw = function(world, renderer) {
  var life = 0;
  if (Date.now() - this.lastSoundMs < this.soundLength) {
    life = 1 - (Date.now() - this.lastSoundMs) / this.soundLength;
    var t = Date.now() / 300;
    this.color.setXYZ(
            1 + life * Math.sin(t + 0),
            1 + life * Math.sin(t + 2*Math.PI/3),
            1 + life * Math.sin(t + 2*2*Math.PI/3));
  } else {
    this.color.setXYZ(1, 1, 1);
  }
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  this.modelMatrix.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0);
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
  this.animating = !!life;
};

ButtonSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};

ButtonSpirit.prototype.isOverlapping = function(world, pointerPos) {
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  return OverlapDetector.isRectOverlappingCircle(
      bodyPos, body.rectRad, pointerPos, ButtonSpirit.POINTER_RADIUS);
};

