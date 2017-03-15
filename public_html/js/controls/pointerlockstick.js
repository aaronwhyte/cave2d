/**
 * A control stick based the Pointer Lock API, using a mouse or trackpad.
 * @constructor
 * @extends {Stick}
 */
function PointerLockStick(elem) {
  Stick.call(this);
  this.elem = elem;
  this.radius = 30;
  var self = this;
  this.tip = new Vec2d();
  this.locked = false;
  this.listening = false;

  this.legacyHack = false;

  this.lastEventTime = 0;
  this.lastGetValTime = 0;

  this.lockChangeListener = function(e) {
    self.onLockChange(e);
  };
  this.lockErrorListener = function(e) {
    self.onLockError(e);
  };
  this.mouseMoveListener = function(e) {
    self.onMouseMove(e);
  };
  this.clickListener = function(e) {
    self.onClick(e);
  };
}

PointerLockStick.prototype = new Stick();
PointerLockStick.prototype.constructor = PointerLockStick;

PointerLockStick.BROWSER_PREFIXES = ['', 'moz', 'webkit'];

PointerLockStick.TOUCH_TIMEOUT_MS = 16 * 3.5;

PointerLockStick.prototype.setRadius = function(r) {
  this.radius = r;
  return this;
};

/**
 * @param canvas
 * @deprecated legacy stuff. Use the constructor.
 * @returns {PointerLockStick}
 */
PointerLockStick.prototype.setCanvas = function(canvas) {
  this.legacyHack = true;
  this.elem = canvas;
  return this;
};

PointerLockStick.prototype.startListening = function() {
  for (var i = 0; i < PointerLockStick.BROWSER_PREFIXES.length; i++) {
    var prefix = PointerLockStick.BROWSER_PREFIXES[i];
    document.addEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.addEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  document.body.addEventListener('mousemove', this.mouseMoveListener);
  this.elem.addEventListener('click', this.clickListener);
  this.listening = true;
  return this;
};

PointerLockStick.prototype.stopListening = function() {
  for (var i = 0; i < PointerLockStick.BROWSER_PREFIXES.length; i++) {
    var prefix = PointerLockStick.BROWSER_PREFIXES[i];
    document.removeEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.removeEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  document.body.removeEventListener('mousemove', this.mouseMoveListener);
  this.elem.removeEventListener('click', this.clickListener);
  this.release();
  this.listening = false;
  return this;
};

PointerLockStick.prototype.getVal = function(out) {
  var now = performance.now();
  if (!this.isTouched()) {
    this.scale(1 - 0.25 * Math.min(1, (now - this.lastGetValTime) / 16));
  }
  this.val.set(this.tip).scale(1 / this.radius).scaleXY(1, -1);
  this.clip();
  if (this.legacyHack) {
    this.scale(0.5);
    if (this.val.magnitudeSquared() < 0.01) {
      this.val.reset();
    }
  }
  this.lastGetValTime = now;
  return out.set(this.val);
};

PointerLockStick.prototype.requestLock = function() {
  this.elem.requestPointerLock = this.elem.requestPointerLock ||
      this.elem.mozRequestPointerLock ||
      this.elem.webkitRequestPointerLock;
  if (this.elem.requestPointerLock) {
    this.elem.requestPointerLock();
  }
};

PointerLockStick.prototype.exitPointerLock = function() {
  document.exitPointerLock = document.exitPointerLock ||
      document.mozExitPointerLock ||
      document.webkitExitPointerLock;
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
};

PointerLockStick.prototype.onLockChange = function(e) {
  this.locked =
      document.pointerLockElement === this.elem ||
      document.mozPointerLockElement === this.elem ||
      document.webkitPointerLockElement === this.elem;
};

PointerLockStick.prototype.onLockError = function(e) {
  console.warn('PointerLockStick.onLockError: ' + e);
};

PointerLockStick.prototype.onMouseMove = function(e) {
  if (!this.isTouched()) {
    this.scale(0.9)
  }
  var dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
  var dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

  var distFrac = 0.5 + 0.5 * this.tip.magnitude() / this.radius;
  this.tip.addXY(dx * distFrac, dy * distFrac).clipToMaxLength(this.radius);

  this.lastEventTime = performance.now();
};

PointerLockStick.prototype.onClick = function(e) {
  // At least on Chrome, you have to click the elem to request pointerlock.
  // If you try to request it in any other execution thread, you'll get an error.
  this.requestLock();
};

PointerLockStick.prototype.isTouchlike = function() {
  return true;
};

PointerLockStick.prototype.isTouched = function() {
  return this.lastEventTime + PointerLockStick.TOUCH_TIMEOUT_MS > performance.now();
};

PointerLockStick.prototype.scale = function(s) {
  this.tip.scale(s);
};

PointerLockStick.prototype.release = function() {
  this.tip.reset();
};