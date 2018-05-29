/**
 * A control trackball for a mouse or trackpad.
 * This is intended for use with pointerlock, but it does not handle pointer lock itself.
 * @constructor
 * @extends {Trackball}
 */
function MouseTrackball(opt_elem) {
  Trackball.call(this);

  this.elem = opt_elem || document.body;
  var self = this;
  this.listening = false;
  this.mouseMotion = new Vec2d();
  this.touched = false;
  this.speed = 0.05;
  this.lockChangeListener = function(e) {
    self.onLockChange(e);
  };
  this.lockErrorListener = function(e) {
    self.onLockError(e);
  };
  this.mouseMoveListener = function(e) {
    self.onMouseMove(e);
  };
  this.mouseDownListener = function(e) {
    self.onMouseDown(e);
  };
  this.clickListener = function(e) {
    self.onClick(e);
  };

  this.pointerLockAllowed = true;
}

MouseTrackball.BROWSER_PREFIXES = ['', 'moz', 'webkit'];

MouseTrackball.prototype = new Trackball();
MouseTrackball.prototype.constructor = MouseTrackball;

MouseTrackball.prototype.startListening = function() {
  for (var i = 0; i < MouseTrackball.BROWSER_PREFIXES.length; i++) {
    var prefix = MouseTrackball.BROWSER_PREFIXES[i];
    document.addEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.addEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  this.elem.addEventListener('mousemove', this.mouseMoveListener);
  this.elem.addEventListener('mousedown', this.mouseDownListener);
  this.elem.addEventListener('click', this.clickListener);
  this.listening = true;
  return this;
};

MouseTrackball.prototype.stopListening = function() {
  for (var i = 0; i < MouseTrackball.BROWSER_PREFIXES.length; i++) {
    var prefix = MouseTrackball.BROWSER_PREFIXES[i];
    document.removeEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.removeEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  this.elem.removeEventListener('mousemove', this.mouseMoveListener);
  this.elem.removeEventListener('mousedown', this.mouseDownListener);
  this.elem.removeEventListener('click', this.clickListener);
  this.listening = false;
  return this;
};


MouseTrackball.prototype.setPointerLockAllowed = function(allowed) {
  this.pointerLockAllowed = allowed;
};

MouseTrackball.prototype.reset = function() {
  if (!this.touched) {
    this.val.scale(1 - this.friction);
  }
  this.mouseMotion.reset();
  this.touched = false;
};

MouseTrackball.prototype.getContrib = function() {
  return this.touched ? Trackball.CONTRIB_MOUSE : 0;
};

MouseTrackball.prototype.onMouseMove = function(e) {
  var dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
  var dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
  this.mouseMotion.addXY(dx * this.speed, dy * this.speed);
  this.val.set(this.mouseMotion);
  this.touched = true;
};

MouseTrackball.prototype.onMouseDown = function(e) {
  this.val.reset();
  this.touched = true;
  this.requestLock();
};

MouseTrackball.prototype.setSpeed = function(s) {
  this.speed = s;
  return this;
};

MouseTrackball.prototype.requestLock = function() {
  if (this.elem.requestPointerLock && this.pointerLockAllowed) {
    this.elem.requestPointerLock();
  }
};

MouseTrackball.prototype.exitPointerLock = function() {
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
};

MouseTrackball.prototype.onLockChange = function(e) {
  this.locked =
      document.pointerLockElement === this.elem ||
      document.mozPointerLockElement === this.elem ||
      document.webkitPointerLockElement === this.elem;
};

MouseTrackball.prototype.onLockError = function(e) {
  console.warn('MouseTrackball.onLockError: ' + e);
};


MouseTrackball.prototype.onClick = function(e) {
  // At least on Chrome, you have to click the elem to request pointerlock.
  // If you try to request it in any other execution thread, you'll get an error.
  this.requestLock();
};

