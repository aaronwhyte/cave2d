/**
 * Control trigger base class
 * @constructor
 */
function Trigger() {
  this.val = false;
}

/**
 * @return {boolean}
 */
Trigger.prototype.getVal = function() {
  return this.val;
};

Trigger.prototype.startListening = function() {console.log("startListening unimplimented")};
Trigger.prototype.stopListening = function() {console.log("stopListening unimplimented")};
