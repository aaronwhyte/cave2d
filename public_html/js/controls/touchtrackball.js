/**
 * A control trackball using a touchscreen.
 * @constructor
 * @extends {Trackball}
 */
function TouchTrackball(opt_elem) {
  Trackball.call(this);
  this.elem = opt_elem || document.body;
  this.oldPagePos = new Vec2d();
  this.touched = false;

  this.pixelMultiplier = 0.2;

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
  this.elem.addEventListener('touchstart', this.touchStartListener);
  this.elem.addEventListener('touchmove', this.touchMoveListener);
  this.elem.addEventListener('touchend', this.touchEndListener);
  this.elem.addEventListener('touchcancel', this.touchEndListener);
  return this;
};

TouchTrackball.prototype.stopListening = function() {
  this.elem.removeEventListener('touchstart', this.touchStartListener);
  this.elem.removeEventListener('touchmove', this.touchMoveListener);
  this.elem.removeEventListener('touchend', this.touchEndListener);
  this.elem.removeEventListener('touchcancel', this.touchEndListener);
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
      var velocity = Vec2d.alloc(touch.pageX - this.oldPagePos.x, touch.pageY - this.oldPagePos.y)
          .scale(this.pixelMultiplier);
      this.val.add(velocity);
      this.oldPagePos.setXY(touch.pageX, touch.pageY);
      velocity.free();
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

TouchTrackball.prototype.getContrib = function() {
  return this.touched ? Trackball.CONTRIB_TOUCH : 0;
};
