/**
 * A control Trigger using a touchscreen.
 * @constructor
 * @extends {Trigger}
 */
function TouchTrigger() {
  Trigger.call(this);
  this.listening = false;

  this.startZoneFn = function(x, y) {
    return true;
  };
  this.touchId = null;

  var self = this;
  this.touchStartListener = function(e) {
    self.onTouchStart(e);
  };
  this.touchEndListener = function(e) {
    self.onTouchEnd(e);
  };
}

TouchTrigger.prototype = new Trigger();
TouchTrigger.prototype.constructor = TouchTrigger;

/**
 * @param {function} fn  A function that takes screen coords (x, y) and returns true if the coords are
 * within the touch trigger start zone.
 * @returns {TouchTrigger}
 */
TouchTrigger.prototype.setStartZoneFunction = function(fn) {
  this.startZoneFn = fn;
  return this;
};

TouchTrigger.prototype.startListening = function() {
  document.body.addEventListener('touchstart', this.touchStartListener);
  document.body.addEventListener('touchmove', this.touchMoveListener);
  document.body.addEventListener('touchend', this.touchEndListener);
  document.body.addEventListener('touchcancel', this.touchEndListener);
  return this;
};

TouchTrigger.prototype.stopListening = function() {
  document.body.removeEventListener('touchstart', this.touchStartListener);
  document.body.removeEventListener('touchmove', this.touchMoveListener);
  document.body.removeEventListener('touchend', this.touchEndListener);
  document.body.removeEventListener('touchcancel', this.touchEndListener);
  this.touchId = null;
  this.val = false;
  return this;
};

TouchTrigger.prototype.onTouchStart = function(e) {
  if (this.touchId !== null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (this.startZoneFn(touch.pageX, touch.pageY)) {
      // Start tracking this one.
      this.touchId = touch.identifier;
      this.val = true;
      break;
    }
  }
};

TouchTrigger.prototype.onTouchEnd = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      this.touchId = null;
      this.val = false;
      break;
    }
  }
};
