/**
 * A single control Trigger, using all mouse keys.
 * @constructor
 * @extends {Trigger}
 */
function MouseTrigger() {
  Trigger.call(this);

  var self = this;
  this.buttonToState = {};
  this.downListener = function(e) {
    if (!e) e = window.event;
    var oldVal = self.getVal();
    self.buttonToState[e.button] = true;
    if (!oldVal) self.publishTriggerDown();
  };
  this.upListener = function(e) {
    if (!e) e = window.event;
    var oldVal = self.getVal();
    self.buttonToState[e.button] = false;
    if (oldVal && !self.getVal()) self.publishTriggerUp();
  };
}

MouseTrigger.prototype = new Trigger();
MouseTrigger.prototype.constructor = MouseTrigger;

MouseTrigger.prototype.startListening = function() {
  document.addEventListener('mousedown', this.downListener);
  document.addEventListener('mouseup', this.upListener);
  return this;
};

MouseTrigger.prototype.stopListening = function() {
  document.removeEventListener('mousedown', this.downListener);
  document.removeEventListener('mouseup', this.upListener);
  for (var b in this.buttonToState) {
    this.buttonToState[b] = false;
  }
  return this;
};

MouseTrigger.prototype.getVal = function() {
  for (var b in this.buttonToState) {
    if (this.buttonToState[b]) return true;
  }
};