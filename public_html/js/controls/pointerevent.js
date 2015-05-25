/**
 * @constructor
 */
function PointerEvent() {
  this.pos = new Vec2d();
  this.reset();
}

/** touch start, and mouse down */
PointerEvent.TYPE_DOWN = 1;

/** touch move and mouse move */
PointerEvent.TYPE_MOVE = 2;

/** touch end+cancel+leave, and mouse up */
PointerEvent.TYPE_UP = 3;

PointerEvent.prototype.reset = function() {
  this.type = null;
  this.pointerId = null;
  this.time = 0;
  this.pos.reset();
  return this;
};

PointerEvent.pool = [];

PointerEvent.alloc = function() {
  if (PointerEvent.pool.length) {
    return PointerEvent.pool.pop().reset();
  }
  return new PointerEvent();
};

PointerEvent.prototype.free = function() {
  PointerEvent.pool.push(this);
};
