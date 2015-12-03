/**
 * Control trigger base class
 * @constructor
 */
function Trigger() {
  this.val = false;
  this.downPubSub = new PubSub();
  this.upPubSub = new PubSub();
}

/**
 * @return {boolean}
 */
Trigger.prototype.getVal = function() {
  return this.val;
};

Trigger.prototype.startListening = function() {console.log("startListening unimplimented")};
Trigger.prototype.stopListening = function() {console.log("stopListening unimplimented")};


Trigger.prototype.addTriggerDownListener = function(fn) {
  this.downPubSub.subscribe(fn);
};

Trigger.prototype.removeTriggerDownListener = function(fn) {
  this.downPubSub.unsubscribe(fn);
};


Trigger.prototype.addTriggerUpListener = function(fn) {
  this.upPubSub.subscribe(fn);
};
Trigger.prototype.removeTriggerUpListener = function(fn) {
  this.upPubSub.unsubscribe(fn);
};


Trigger.prototype.publishTriggerDown = function() {
  this.downPubSub.publish();
};

Trigger.prototype.publishTriggerUp = function() {
  this.upPubSub.publish();
};
