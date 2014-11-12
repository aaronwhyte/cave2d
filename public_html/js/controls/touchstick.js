/**
 * A control stick based on touch events.
 * @constructor
 * @extends {Stick}
 */
function TouchStick() {
  Stick.call(this);

  this.radius = 30;
  this.startZoneFn = function(x, y) {
    return true;
  };

  var self = this;

  this.center = new Vec2d();
  this.tip = new Vec2d();

  // When this is null, we're not tracking a touch.
  this.touchId = null;

  this.touchStartListener = function(e) {
    self.onTouchStart(e);
  };
  this.touchMoveListener = function(e) {
    self.onTouchMove(e);
  };
  this.touchEndListener = function(e) {
    self.onTouchEnd(e);
  };
}
TouchStick.prototype = new Stick();
TouchStick.prototype.constructor = TouchStick;

TouchStick.prototype.setStartZoneFunction = function(fn) {
  this.startZoneFn = fn;
  return this;
};

TouchStick.prototype.setRadius = function(r) {
  this.radius = r;
  return this;
};

TouchStick.prototype.startListening = function() {
  document.body.addEventListener('touchstart', this.touchStartListener);
  document.body.addEventListener('touchmove', this.touchMoveListener);
  document.body.addEventListener('touchend', this.touchEndListener);
  document.body.addEventListener('touchcancel', this.touchEndListener);
  return this;

};

TouchStick.prototype.stopListening = function() {
  document.body.removeEventListener('touchstart', this.touchStartListener);
  document.body.removeEventListener('touchmove', this.touchMoveListener);
  document.body.removeEventListener('touchend', this.touchEndListener);
  document.body.removeEventListener('touchcancel', this.touchEndListener);
  return this;
};

TouchStick.prototype.getVal = function(out) {
  this.val.set(this.tip).subtract(this.center).scale(1 / this.radius).scaleXY(1, -1);
  this.clip();
  return out.set(this.val);
};

TouchStick.prototype.onTouchStart = function(e) {
  if (this.touchId !== null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (this.startZoneFn(touch.pageX, touch.pageY)) {
      // Start tracking this one.
      this.touchId = touch.identifier;
      console.log('touchId: ' + this.touchId);
      this.center.setXY(touch.pageX, touch.pageY);
      this.tip.setXY(touch.pageX, touch.pageY);
      break;
    }
  }
};

TouchStick.prototype.onTouchMove = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      // Keep tracking this one.
      this.tip.setXY(touch.pageX, touch.pageY);
      var dist = this.tip.distance(this.center);
      var max = this.radius;
      if (dist > max) {
        this.center.slideByFraction(this.tip, (dist - max) / dist);
      }
      break;
    }
  }
};

TouchStick.prototype.onTouchEnd = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      this.touchId = null;
      this.center.setXY(touch.pageX, touch.pageY);
      this.tip.setXY(touch.pageX, touch.pageY);
      break;
    }
  }
};

