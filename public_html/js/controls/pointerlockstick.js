/**
 * A control stick based the Pointer Lock API, using a mouse or trackpad.
 * @constructor
 * @extends {Stick}
 */
function PointerLockStick() {
  Stick.call(this);
  this.radius = 30;
  var self = this;
  this.tip = new Vec2d();
  this.locked = false;
  this.listening = false;

  this.canvas = null;

  this.lockChangeListener = function(e) {
    self.onLockChange(e);
  };
  this.lockErrorListener = function(e) {
    self.onLockError(e);
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
  this.clickListener = function(e) {
    self.onClick(e);
  };
}

PointerLockStick.prototype = new Stick();
PointerLockStick.prototype.constructor = PointerLockStick;

PointerLockStick.BROWSER_PREFIXES = ['', 'moz', 'webkit'];

PointerLockStick.prototype.setRadius = function(r) {
  this.radius = r;
  return this;
};

PointerLockStick.prototype.setCanvas = function(canvas) {
  this.canvas = canvas;
  return this;
};

PointerLockStick.prototype.startListening = function() {
  for (var i = 0; i < PointerLockStick.BROWSER_PREFIXES.length; i++) {
    var prefix = PointerLockStick.BROWSER_PREFIXES[i];
    document.addEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.addEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  document.body.addEventListener('mousedown', this.mouseDownListener);
  document.body.addEventListener('mousemove', this.mouseMoveListener);
  document.body.addEventListener('mouseup', this.mouseUpListener);
  this.canvas.addEventListener('click', this.clickListener);
  this.listening = true;
  return this;

};

PointerLockStick.prototype.stopListening = function() {
  for (var i = 0; i < PointerLockStick.BROWSER_PREFIXES.length; i++) {
    var prefix = PointerLockStick.BROWSER_PREFIXES[i];
    document.removeEventListener('on' + prefix + 'pointerlockchange', this.lockChangeListener, false);
    document.removeEventListener(prefix + 'pointerlockerror', this.lockErrorListener, false);
  }
  document.body.removeEventListener('mousedown', this.mouseDownListener);
  document.body.removeEventListener('mousemove', this.mouseMoveListener);
  document.body.removeEventListener('mouseup', this.mouseUpListener);
  this.canvas.removeEventListener('click', this.clickListener);
  this.listening = false;
  return this;
};

PointerLockStick.prototype.getVal = function(out) {
  if (this.mouseDown) {
    this.val.set(this.tip).scale(1 / this.radius).scaleXY(1, -1);
    this.clip();
    return out.set(this.val);
  } else {
    return out.reset();
  }
};

PointerLockStick.prototype.requestLock = function() {
  this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
      this.canvas.mozRequestPointerLock ||
      this.canvas.webkitRequestPointerLock;
  if (this.canvas.requestPointerLock) {
    this.canvas.requestPointerLock();
  }
};

PointerLockStick.prototype.exitPointerLock = function() {
  document.exitPointerLock = document.exitLock ||
      document.mozExitPointerLock ||
      document.webkitExitPointerLock;
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
};

PointerLockStick.prototype.onLockChange = function(e) {
  this.locked =
      document.pointerLockElement === this.canvas ||
      document.mozPointerLockElement === this.canvas ||
      document.webkitPointerLockElement === this.canvas;
};

PointerLockStick.prototype.onLockError = function(e) {
  console.warn('PointerLockStick.onLockError: ' + e);
};

PointerLockStick.prototype.onMouseDown = function(e) {
  this.mouseDown = true;
};

PointerLockStick.prototype.onMouseMove = function(e) {
  var dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
  var dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
  this.tip.addXY(dx, dy).clipToMaxLength(this.radius);
};

PointerLockStick.prototype.onMouseUp = function(e) {
  this.mouseDown = false;
};

PointerLockStick.prototype.onClick = function(e) {
  // At least on Chrome, you have to click the canvas to request pointerlock.
  // If you try to request it in any other execution thread, you'll get an error.
  this.requestLock();
};
