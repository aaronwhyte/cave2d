/**
 * Simple object that keeps track of slot state and turns listeners on and off for state transitions.
 * @constructor
 */
function PlayerSlot() {
  this.stateMap = {};
  this.stateName = null;

  // hm...
  this.lastSpiritId = null;
}

/**
 * @param {String} stateName
 * @param {ControlMap} controlList
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.add = function(stateName, controlList) {
  this.stateMap[stateName] = controlList;
  return this;
};

/**
 * @param {String} newStateName
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.setState = function(newStateName) {
  if (this.stateName == newStateName) return;
  var oldControls = this.stateMap[this.stateName];
  if (oldControls) oldControls.stopListening();

  var newControls = this.stateMap[newStateName];
  if (newControls) newControls.startListening();
  this.stateName = newStateName;
  return this;
};

/**
 * @returns {ControlMap}
 */
PlayerSlot.prototype.getControlList = function() {
  return this.stateMap[this.stateName];
};

/**
 * @returns {ControlMap}
 */
PlayerSlot.prototype.getControlListForState = function(stateName) {
  return this.stateMap[stateName];
};

/**
 * @param {Renderer} renderer
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.draw = function(renderer) {
  var c = this.getControlList();
  if (c) c.draw(renderer);
  return this;
};

/**
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.releaseControls = function() {
  var c = this.getControlList();
  if (c) c.releaseControls();
  return this;
};