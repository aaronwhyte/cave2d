/**
 * A control trackball using a touchscreen.
 * @constructor
 * @extends {Trackball}
 */
function TouchTrackball() {
  Trackball.call(this);
  this.listening = false;
  this.oldPagePos = new Vec2d();
  this.touched = false;
  this.speed = 0.15;

  // The final speed will be a weighted average of the 1:1 motion and an exponent of that motion.
  this.motionExpContribution = 0.1;
  this.motionExponent = 1.7;
  this.motionExpMax = 20;

  this.dirtyVal = false;
  this.startZoneFn = function(x, y) {
    return true;
  };

  var self = this;

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

TouchTrackball.prototype = new Trackball();
TouchTrackball.prototype.constructor = TouchTrackball;

TouchTrackball.prototype.setStartZoneFunction = function(fn) {
  this.startZoneFn = fn;
  return this;
};

TouchTrackball.prototype.startListening = function() {
  document.body.addEventListener('touchstart', this.touchStartListener);
  document.body.addEventListener('touchmove', this.touchMoveListener);
  document.body.addEventListener('touchend', this.touchEndListener);
  document.body.addEventListener('touchcancel', this.touchEndListener);
  return this;
};

TouchTrackball.prototype.stopListening = function() {
  document.body.removeEventListener('touchstart', this.touchStartListener);
  document.body.removeEventListener('touchmove', this.touchMoveListener);
  document.body.removeEventListener('touchend', this.touchEndListener);
  document.body.removeEventListener('touchcancel', this.touchEndListener);
  this.touchId = null;
  return this;
};

TouchTrackball.prototype.onTouchStart = function(e) {
  if (this.touchId !== null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (this.startZoneFn(touch.pageX, touch.pageY)) {
      // Start tracking this one.
      this.touchId = touch.identifier;
      this.val.reset();
      this.oldPagePos.setXY(touch.pageX, touch.pageY);
      this.touched = true;
      break;
    }
  }
};

TouchTrackball.prototype.onTouchMove = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      // Keep tracking this one.
      if (this.dirtyVal) {
        this.val.reset();
        this.dirtyVal = false;
      }
      var motionX = (touch.pageX - this.oldPagePos.x) * this.speed;
      var motionY = (touch.pageY - this.oldPagePos.y) * this.speed;
      var motionMag = Vec2d.magnitude(motionX, motionY);
      var motionMagExp = Math.min(this.motionExpMax, Math.pow(motionMag, this.motionExponent));
      var accelX =
          motionX * (1 - this.motionExpContribution) +
          motionX * motionMagExp * this.motionExpContribution;
      var accelY =
          motionY * (1 - this.motionExpContribution) +
          motionY * motionMagExp * this.motionExpContribution;
      this.val.addXY(accelX,  accelY);
      this.oldPagePos.setXY(touch.pageX, touch.pageY);
      break;
    }
  }
};

TouchTrackball.prototype.onTouchEnd = function(e) {
  if (this.touchId === null) return;
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    if (touch.identifier == this.touchId) {
      this.touchId = null;
      this.touched = false;
      break;
    }
  }
};

TouchTrackball.prototype.reset = function() {
  if (!this.touched) {
    this.val.scale(1 - this.friction);
  } else {
    if (this.dirtyVal) {
      // Touched, but there were no events in the last iteration.
      // Tap the brakes.
      this.val.scale(0.5);
    }
  }
  this.dirtyVal = true;
};
