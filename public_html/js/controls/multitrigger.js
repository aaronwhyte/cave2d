/**
 * A control trigger that combines other trigger inputs into one.
 * @constructor
 * @extends {Trigger}
 */
function MultiTrigger() {
  Trigger.call(this);
  this.triggers = [];
}
MultiTrigger.prototype = new Trigger();
MultiTrigger.prototype.constructor = MultiTrigger;

MultiTrigger.prototype.addTrigger = function(t) {
  this.triggers.push(t);
  return this;
};

MultiTrigger.prototype.startListening = function() {
  for (var i = 0; i < this.triggers.length; i++) {
    this.triggers[i].startListening();
  }
};

MultiTrigger.prototype.stopListening = function() {
  for (var i = 0; i < this.triggers.length; i++) {
    this.triggers[i].stopListening();
  }
};

MultiTrigger.prototype.getVal = function() {
  for (var i = 0; i < this.triggers.length; i++) {
    if (this.triggers[i].getVal()) return true;
  }
  return false;
};
