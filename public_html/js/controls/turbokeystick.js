/**
 * A control stick based on a keyboard, with a "turbo" trigger to make you go faster.
 * @constructor
 * @extends {Stick}
 */
function TurboKeyStick() {
  Stick.call(this);
  this.codeToDir = {};
  this.codeToState = {};
  this.keys = new Keys();

  this.turboTrigger = null;
  this.regularMultiplier = 0.4;
  this.turboMultiplier = 1;
  this.listening = false;

  var self = this;
  this.downListener = function(e) {
    if (!e) e = window.event;
    if (self.codeToDir[e.keyCode]) {
      self.codeToState[e.keyCode] = true;
    }
  };
  this.upListener = function(e) {
    if (!e) e = window.event;
    if (self.codeToDir[e.keyCode]) {
      self.codeToState[e.keyCode] = false;
    }
  };
}

TurboKeyStick.prototype = new Stick();
TurboKeyStick.prototype.constructor = TurboKeyStick;

TurboKeyStick.UP = new Vec2d(0, 1);
TurboKeyStick.RIGHT = new Vec2d(1, 0);
TurboKeyStick.DOWN = new Vec2d(0, -1);
TurboKeyStick.LEFT = new Vec2d(-1, 0);

TurboKeyStick.prototype.setByKeyCode = function(keyCode, vec) {
  this.codeToDir[keyCode] = vec;
  return this;
};

TurboKeyStick.prototype.setByName = function(name, vec) {
  var keyCode = this.keys.getKeyCodeForName(name);
  this.setByKeyCode(keyCode, vec);
  return this;
};

TurboKeyStick.prototype.setUpRightDownLeftByName = function(up, right, down, left) {
  this.setByName(up, TurboKeyStick.UP);
  this.setByName(right, TurboKeyStick.RIGHT);
  this.setByName(down, TurboKeyStick.DOWN);
  this.setByName(left, TurboKeyStick.LEFT);
  return this;
};

TurboKeyStick.prototype.setTurboTrigger = function(trigger) {
  this.turboTrigger = trigger;
  if (trigger && this.listening) {
    trigger.startListening();
  }
  return this;
};

TurboKeyStick.prototype.startListening = function() {
  if (!this.listening) {
    document.addEventListener('keydown', this.downListener);
    document.addEventListener('keyup', this.upListener);
    if (this.turboTrigger) this.turboTrigger.startListening();
    this.listening = true;
  }
  return this;
};

TurboKeyStick.prototype.stopListening = function() {
  if (this.listening) {
    document.removeEventListener('keydown', this.downListener);
    document.removeEventListener('keyup', this.upListener);
    if (this.turboTrigger) this.turboTrigger.stopListening();
    this.listening = false;
    this.release();
  }
  return this;
};

TurboKeyStick.prototype.getVal = function(out) {
  this.val.reset();
  for (var code in this.codeToState) {
    if (this.codeToState[code]) {
      this.val.add(this.codeToDir[code]);
    }
  }
  this.clip();
  this.val.scale(this.isTurboDown() ? this.turboMultiplier : this.regularMultiplier);
  return out.set(this.val);
};

TurboKeyStick.prototype.isTurboDown = function() {
  return this.turboTrigger.getVal();
};

TurboKeyStick.prototype.isAnyKeyPressed = function() {
  if (this.isTurboDown()) return true;
  for (var code in this.codeToState) {
    if (this.codeToState[code]) {
      return true;
    }
  }
  return false;
};

TurboKeyStick.prototype.release = function() {
  for (var code in this.codeToState) {
    this.codeToState[code] = false;
  }
  this.turboTrigger.release();
};