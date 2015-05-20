/**
 * @constructor
 * @extends {Spirit}
 */
function ButtonSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.multiPointer = null;
  this.modelStamp = null;

  this.color = new Vec4();
  this.lastSoundMs = 0;
  this.soundLength = 1;
  this.onClick = null;

  this.vec2d = new Vec2d();
}
ButtonSpirit.prototype = new Spirit();
ButtonSpirit.prototype.constructor = ButtonSpirit;

ButtonSpirit.POINTER_RADIUS = 0.2;

ButtonSpirit.prototype.setMultiPointer = function(multiPointer) {
  this.multiPointer = multiPointer;
};

ButtonSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ButtonSpirit.prototype.setOnClick = function(func) {
  this.onClick = func;
};

ButtonSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  if (this.multiPointer && this.onClick) {
    for (var key in this.multiPointer.pos) {
      var oldPointerPos = this.multiPointer.oldPos[key];
      var pointerPos = this.multiPointer.pos[key];
      if (!(oldPointerPos && this.isOverlapping(world, oldPointerPos))
          && this.isOverlapping(world, pointerPos)) {
        vec4.setXYZ(pointerPos.x, pointerPos.y, 0);
        vec4.transform(renderer.getViewMatrix());
        this.onClick(world, vec4.v[0], vec4.v[1]);
      }
    }
  }
  var life = 0;
  if (Date.now() - this.lastSoundMs < this.soundLength) {
    life = 1 - (Date.now() - this.lastSoundMs) / this.soundLength;
    var t = Date.now() / 300;
    this.color.setXYZ(
            0.5 + life * 0.5 * Math.sin(t + 0),
            0.5 + life * 0.5 * Math.sin(t + 2*Math.PI/3),
            0.5 + life * 0.5 * Math.sin(t + 2*2*Math.PI/3));
  } else {
    this.color.setXYZ(0.5, 0.5, 0.5);
  }
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  modelMatrix.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0);
  modelMatrix.multiply(mat4.toScaleOpXYZ(1, 1, 1+life));
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
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

