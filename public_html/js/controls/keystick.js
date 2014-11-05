/**
 * A control stick based on a keyboard.
 * @constructor
 * @extends {Stick}
 */
function KeyStick() {
  Stick.call(this);
  this.codeToDir = {};
  this.codeToState = {};
  this.keys = new Keys();

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

  // default arrow keys
  this.setUpRightDownLeftByName(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT);
}

KeyStick.prototype = new Stick();
KeyStick.prototype.constructor = KeyStick;

KeyStick.UP = new Vec2d(0, 1);
KeyStick.RIGHT = new Vec2d(1, 0);
KeyStick.DOWN = new Vec2d(0, -1);
KeyStick.LEFT = new Vec2d(-1, 0);

KeyStick.prototype.setByKeyCode = function(keyCode, vec) {
  this.codeToDir[keyCode] = vec;
};

KeyStick.prototype.setByName = function(name, vec) {
  var keyCode = this.keys.getKeyCodeForName(name);
  this.setByKeyCode(keyCode, vec);
};

KeyStick.prototype.setUpRightDownLeftByName = function(up, right, down, left) {
  this.setByName(up, KeyStick.UP);
  this.setByName(right, KeyStick.RIGHT);
  this.setByName(down, KeyStick.DOWN);
  this.setByName(left, KeyStick.LEFT);
};

KeyStick.prototype.startListening = function() {
  document.addEventListener('keydown', this.downListener);
  document.addEventListener('keyup', this.upListener);
};

KeyStick.prototype.stopListening = function() {
  document.removeEventListener('keydown', this.downListener);
  document.removeEventListener('keyup', this.upListener);
};

KeyStick.prototype.getVal = function(out) {
  this.val.reset();
  for (var code in this.codeToState) {
    if (this.codeToState[code]) {
      this.val.add(this.codeToDir[code]);
    }
  }
  this.clip();
  return out.set(this.val);
};
