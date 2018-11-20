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
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.overlapIds = new Set();
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

ButtonSpirit.prototype.lookForClick = function(world, renderer) {
  // I don't trust a long-lived cache, so re-initialize it now.
  this.overlapIds.clear();
  for (var pointerId in this.multiPointer.oldPositions) {
    var oldPos = this.multiPointer.oldPositions[pointerId];
    if (oldPos && this.isOverlapping(world, oldPos)) {
      this.overlapIds.add(pointerId);
    }
  }
  // Process all events.
  for (var i = 0, n = this.multiPointer.getQueueSize(); i < n; i++) {
    var e = this.multiPointer.getPointerEventFromTail(i);
    if (this.overlapIds.has(e.pointerId)) {
      // Look for an 'up' or a move-out to clear the overlap.
      if (e.type === PointerEvent.TYPE_UP) {
        this.overlapIds.delete(e.pointerId);
      } else if (e.type === PointerEvent.TYPE_MOVE && !this.isOverlapping(world, e.pos)) {
        this.overlapIds.delete(e.pointerId);
      }
    } else {
      // Look for a down or move-in to start a new overlap.
      if (e.type === PointerEvent.TYPE_DOWN || e.type === PointerEvent.TYPE_MOVE) {
        if (this.isOverlapping(world, e.pos)) {
          this.vec4.setXYZ(e.pos.x, e.pos.y, 0);
          this.vec4.transform(renderer.getViewMatrix());
          this.onClick(world, this.vec4.v[0], this.vec4.v[1]);
          // Only allow one per frame.
          break;
        }
      }
    }
  }
};

ButtonSpirit.prototype.onDraw = function(world, renderer) {
  if (this.multiPointer && this.onClick) {
    this.lookForClick(world, renderer);
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
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  this.modelMatrix.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0);
  this.modelMatrix.multiply(this.mat44.toScaleOpXYZ(1, 1, 1+life));
  renderer.setModelMatrix(this.modelMatrix);
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

