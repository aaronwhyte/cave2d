/**
 * Dumb pollable multiply pointer, blending mouse and touch on a canvas.
 * @constructor
 */
function MonoPointer() {
  this.down = false;
  this.pos = new Vec2d();

  // When this is null, we're not tracking a touch.
  this.touchId = null;

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
}

// Weak - better if I could use "half an inch" or something.
MonoPointer.TOUCH_Y_OFFSET = -60;

MonoPointer.prototype.startListening = function() {
  document.body.addEventListener('mousedown', this.mouseDownListener);
  document.body.addEventListener('mousemove', this.mouseMoveListener);
  document.body.addEventListener('mouseup', this.mouseUpListener);
  document.body.addEventListener('touchstart', this.touchStartListener);
  document.body.addEventListener('touchmove', this.touchMoveListener);
  document.body.addEventListener('touchend', this.touchEndListener);
  document.body.addEventListener('touchcancel', this.touchEndListener);
  this.listening = true;
  return this;
};

MonoPointer.prototype.stopListening = function() {
  document.body.removeEventListener('mousedown', this.mouseDownListener);
  document.body.removeEventListener('mousemove', this.mouseMoveListener);
  document.body.removeEventListener('mouseup', this.mouseUpListener);
  document.body.removeEventListener('touchstart', this.touchStartListener);
  document.body.removeEventListener('touchmove', this.touchMoveListener);
  document.body.removeEventListener('touchend', this.touchEndListener);
  document.body.removeEventListener('touchcancel', this.touchEndListener);
  this.listening = false;
  return this;
};

MonoPointer.prototype.onMouseDown = function(e) {
  this.down = true;
  this.pos.setXY(e.clientX, e.clientY);
};

MonoPointer.prototype.onMouseMove = function(e) {
  this.pos.setXY(e.clientX, e.clientY);
};

MonoPointer.prototype.onMouseUp = function(e) {
  this.down = false;
  this.pos.setXY(e.clientX, e.clientY);
};

MonoPointer.prototype.onTouchStart = function(e) {
  if (this.touchId !== null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    // Start tracking this one.
    this.touchId = touch.identifier;
    this.pos.setXY(touch.pageX, touch.pageY + MonoPointer.TOUCH_Y_OFFSET);
    this.down = true;
    break;
  }
};

MonoPointer.prototype.onTouchMove = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      this.pos.setXY(touch.pageX, touch.pageY + MonoPointer.TOUCH_Y_OFFSET);
      break;
    }
  }
};

MonoPointer.prototype.onTouchEnd = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      this.touchId = null;
      this.pos.setXY(touch.pageX, touch.pageY + MonoPointer.TOUCH_Y_OFFSET);
      this.down = false;
      break;
    }
  }
};
