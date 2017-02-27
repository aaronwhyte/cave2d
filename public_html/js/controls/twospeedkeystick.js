/**
 * A control stick based on a keyboard, with a "speed" trigger to make you go a different speed.
 * @constructor
 * @extends {Stick}
 */
function TwoSpeedKeyStick() {
  Stick.call(this);
  this.codeToDir = {};
  this.codeToState = {};
  this.keys = new Keys();

  this.speedTrigger = null;
  this.defaultMultiplier = 0.4;
  this.speedTwoMultiplier = 1;
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

TwoSpeedKeyStick.prototype = new Stick();
TwoSpeedKeyStick.prototype.constructor = TwoSpeedKeyStick;

TwoSpeedKeyStick.UP = new Vec2d(0, 1);
TwoSpeedKeyStick.RIGHT = new Vec2d(1, 0);
TwoSpeedKeyStick.DOWN = new Vec2d(0, -1);
TwoSpeedKeyStick.LEFT = new Vec2d(-1, 0);

TwoSpeedKeyStick.prototype.setByKeyCode = function(keyCode, vec) {
  this.codeToDir[keyCode] = vec;
  return this;
};

TwoSpeedKeyStick.prototype.setByName = function(name, vec) {
  var keyCode = this.keys.getKeyCodeForName(name);
  this.setByKeyCode(keyCode, vec);
  return this;
};

TwoSpeedKeyStick.prototype.setUpRightDownLeftByName = function(up, right, down, left) {
  this.setByName(up, TwoSpeedKeyStick.UP);
  this.setByName(right, TwoSpeedKeyStick.RIGHT);
  this.setByName(down, TwoSpeedKeyStick.DOWN);
  this.setByName(left, TwoSpeedKeyStick.LEFT);
  return this;
};

TwoSpeedKeyStick.prototype.setSpeedTrigger = function(trigger) {
  this.speedTrigger = trigger;
  if (trigger && this.listening) {
    trigger.startListening();
  }
  return this;
};

TwoSpeedKeyStick.prototype.setDefaultMultiplier = function(m) {
  this.defaultMultiplier = m;
  return this;
};

TwoSpeedKeyStick.prototype.setSpeedTwoMultiplier = function(m) {
  this.speedTwoMultiplier = m;
  return this;
};

TwoSpeedKeyStick.prototype.startListening = function() {
  if (!this.listening) {
    document.addEventListener('keydown', this.downListener);
    document.addEventListener('keyup', this.upListener);
    if (this.speedTrigger) this.speedTrigger.startListening();
    this.listening = true;
  }
  return this;
};

TwoSpeedKeyStick.prototype.stopListening = function() {
  if (this.listening) {
    document.removeEventListener('keydown', this.downListener);
    document.removeEventListener('keyup', this.upListener);
    if (this.speedTrigger) this.speedTrigger.stopListening();
    this.listening = false;
    this.release();
  }
  return this;
};

TwoSpeedKeyStick.prototype.getVal = function(out) {
  this.val.reset();
  for (var code in this.codeToState) {
    if (this.codeToState[code]) {
      this.val.add(this.codeToDir[code]);
    }
  }
  this.clip();
  this.val.scale(this.isSpeedTriggerDown() ? this.speedTwoMultiplier : this.defaultMultiplier);
  return out.set(this.val);
};

TwoSpeedKeyStick.prototype.isSpeedTriggerDown = function() {
  return this.speedTrigger.getVal();
};

TwoSpeedKeyStick.prototype.isAnyKeyPressed = function() {
  if (this.isSpeedTriggerDown()) return true;
  for (var code in this.codeToState) {
    if (this.codeToState[code]) {
      return true;
    }
  }
  return false;
};

TwoSpeedKeyStick.prototype.release = function() {
  for (var code in this.codeToState) {
    this.codeToState[code] = false;
  }
  this.speedTrigger.release();
};