/**
 * A control stick based on a keyboard.
 * @constructor
 * @extends {Stick}
 */
function KeyClickPad() {
  ClickPad.call(this);
  this.codeToDir = {};
  this.keys = new Keys();

  var self = this;
  this.keyPressListener = function(e) {
    if (!e) e = window.event;
    var dir = self.codeToDir[e.keyCode];
    if (dir) {
      self.clickPubSub.publish(dir.x, dir.y);
    }
  };
}

KeyClickPad.prototype = new ClickPad();
KeyClickPad.prototype.constructor = KeyClickPad;

KeyClickPad.prototype.setUpRightDownLeftByName = function(up, right, down, left) {
  this.setByName(up, ClickPad.UP);
  this.setByName(right, ClickPad.RIGHT);
  this.setByName(down, ClickPad.DOWN);
  this.setByName(left, ClickPad.LEFT);
  return this;
};

KeyClickPad.prototype.startListening = function() {
  document.addEventListener('keypress', this.keyPressListener);
  return this;
};

KeyClickPad.prototype.stopListening = function() {
  document.removeEventListener('keypress', this.keyPressListener);
  return this;
};


KeyClickPad.prototype.setByKeyCode = function(keyCode, vec) {
  this.codeToDir[keyCode] = vec;
  return this;
};

KeyClickPad.prototype.setByName = function(name, vec) {
  var keyCode = this.keys.getKeyCodeForName(name);
  this.setByKeyCode(keyCode, vec);
  return this;
};

