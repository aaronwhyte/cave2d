/**
 * Multiple pointer handler, blending mouse and touch on a canvas.
 * @param canvas
 *
 * @constructor
 */
function MultiPointer2(canvas) {
  this.canvas = canvas;
  var self = this;

  this.touchStartListener = function(e) {
    self.onTouchStart(e);
  };
  this.touchMoveListener = function(e) {
    self.onTouchMove(e);
  };
  this.touchEndListener = function(e) {
    self.onTouchEnd(e);
  };
  this.mouseDownListener = function(e) {
    self.onMouseDown(e);
  };
  this.mouseMoveListener = function(e) {
    self.onMouseMove(e);
  };
  this.mouseUpListener = function(e) {
    self.onMouseUp(e);
  };

  this.listeners = new ArraySet();
  this.listening = false;
}

MultiPointer2.MOUSE_ID = 'mouse';

MultiPointer2.prototype.startListening = function() {
  if (!this.listening) {
    document.body.addEventListener('mousedown', this.mouseDownListener);
    document.body.addEventListener('mousemove', this.mouseMoveListener);
    document.body.addEventListener('mouseup', this.mouseUpListener);
    document.body.addEventListener('touchstart', this.touchStartListener);
    document.body.addEventListener('touchmove', this.touchMoveListener);
    document.body.addEventListener('touchend', this.touchEndListener);
    document.body.addEventListener('touchcancel', this.touchEndListener);
    document.body.addEventListener('touchleave', this.touchEndListener);
    this.listening = true;
  }
  return this;
};

MultiPointer2.prototype.stopListening = function() {
  if (this.listening) {
    document.body.removeEventListener('mousedown', this.mouseDownListener);
    document.body.removeEventListener('mousemove', this.mouseMoveListener);
    document.body.removeEventListener('mouseup', this.mouseUpListener);
    document.body.removeEventListener('touchstart', this.touchStartListener);
    document.body.removeEventListener('touchmove', this.touchMoveListener);
    document.body.removeEventListener('touchend', this.touchEndListener);
    document.body.removeEventListener('touchcancel', this.touchEndListener);
    document.body.removeEventListener('touchleave', this.touchEndListener);
    this.listening = false;
  }
  return this;
};

/**
 * Adds a function that will be called as part of the read DOM event handler stack.
 * The function will be called with a PointerEvent.
 * @param {Function} fn
 */
MultiPointer2.prototype.addListener = function(fn) {
  this.listeners.put(fn);
};

/**
 * @param {Function} fn
 */
MultiPointer2.prototype.removeListener = function(fn) {
  this.listeners.remove(fn);
};

MultiPointer2.prototype.isPointerLocked = function() {
  return document.pointerLockElement ||
         document.mozPointerLockElement ||
         document.webkitPointerLockElement;
};

MultiPointer2.prototype.onMouseDown = function(e) {
  if (!this.isPointerLocked()) {
    this.down(MultiPointer2.MOUSE_ID, e.clientX, e.clientY);
  }
};

MultiPointer2.prototype.onMouseMove = function(e) {
  this.move(MultiPointer2.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer2.prototype.onMouseUp = function(e) {
  this.up(MultiPointer2.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer2.prototype.onTouchStart = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.down(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer2.prototype.onTouchMove = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.move(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer2.prototype.onTouchEnd = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.up(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer2.prototype.down = function(id, x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_DOWN;
  e.pointerId = id;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.callListeners(e);
  e.free();
};

MultiPointer2.prototype.move = function(id, x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_MOVE;
  e.pointerId = id;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.callListeners(e);
  e.free();
};

MultiPointer2.prototype.up = function(id, x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_UP;
  e.pointerId = id;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.callListeners(e);
  e.free();
};

MultiPointer2.prototype.callListeners = function(e) {
  var listeners = this.listeners.vals;
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](e);
  }
};
