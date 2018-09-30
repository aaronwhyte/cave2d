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

Trigger.prototype.release = function() {
  this.val = false;
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


Trigger.prototype.publishTriggerDown = function(e) {
  this.downPubSub.publish(e);
};

Trigger.prototype.publishTriggerUp = function(e) {
  this.upPubSub.publish(e);
};

/**
 * @param {ControlMap} controlMap
 * @param {string} controlName
 */
Trigger.prototype.registerEventQueue = function(controlMap, controlName) {
  this.controlMap = controlMap;
  this.controlName = controlName;
  let self = this;
  this.addTriggerDownListener(function() {
    self.controlMap.enqueueEvent(self.controlName, ControlEvent.Type.PRESS).setBool(true);
  });
  this.addTriggerUpListener(function() {
    self.controlMap.enqueueEvent(self.controlName, ControlEvent.Type.PRESS).setBool(false);
  });
};