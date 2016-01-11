/**
 * A single control Trigger, using keyboard keys.
 * @constructor
 * @extends {Trigger}
 */
function KeyTrigger() {
  Trigger.call(this);

  this.keys = new Keys();
  this.triggerKeyCodes = {};
  this.codeToState = {};

  var self = this;
  this.downListener = function(e) {
    if (!e) e = window.event;
    if (self.triggerKeyCodes[e.keyCode]) {
      var oldVal = self.getVal();
      self.codeToState[e.keyCode] = true;
      if (!oldVal) self.publishTriggerDown(e);
    }
  };
  this.upListener = function(e) {
    if (!e) e = window.event;
    if (self.triggerKeyCodes[e.keyCode]) {
      var oldVal = self.getVal();
      self.codeToState[e.keyCode] = false;
      if (oldVal && !self.getVal()) self.publishTriggerUp(e);
    }
  };
}

KeyTrigger.prototype = new Trigger();
KeyTrigger.prototype.constructor = KeyTrigger;

KeyTrigger.prototype.addTriggerKeyByCode = function(keyCode) {
  this.triggerKeyCodes[keyCode] = true;
  return this;
};

KeyTrigger.prototype.addTriggerKeyByName = function(name) {
  var keyCode = this.keys.getKeyCodeForName(name);
  return this.addTriggerKeyByCode(keyCode);
};

KeyTrigger.prototype.startListening = function() {
  document.addEventListener('keydown', this.downListener);
  document.addEventListener('keyup', this.upListener);
  return this;
};

KeyTrigger.prototype.stopListening = function() {
  document.removeEventListener('keydown', this.downListener);
  document.removeEventListener('keyup', this.upListener);
  for (var code in this.codeToState) {
    this.codeToState[code] = false;
  }
  return this;
};

KeyTrigger.prototype.getVal = function() {
  for (var code in this.codeToState) {
    if (this.codeToState[code]) return true;
  }
};