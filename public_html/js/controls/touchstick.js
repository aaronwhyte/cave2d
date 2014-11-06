/**
 * A control stick based on touch events.
 * @constructor
 * @extends {Stick}
 */
function TouchStick() {
  Stick.call(this);

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

TouchStick.prototype = new Stick();
TouchStick.prototype.constructor = TouchStick;

TouchStick.prototype.startListening = function() {
  document.addEventListener('keydown', this.downListener);
  document.addEventListener('keyup', this.upListener);
};

TouchStick.prototype.stopListening = function() {
  document.removeEventListener('keydown', this.downListener);
  document.removeEventListener('keyup', this.upListener);
};

TouchStick.prototype.getVal = function(out) {
  this.val.reset();
  return out.set(this.val);
};
