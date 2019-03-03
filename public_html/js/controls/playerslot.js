/**
 * Simple object that keeps track of slot state and turns listeners on and off for state transitions.
 * @constructor
 */
function PlayerSlot() {
  // Each key is stateName and each value is a ControlMap.
  this.stateMap = {};

  // The slot's current state.
  this.stateName = null;

  // hm...
  this.lastSpiritId = null;
}

/**
 * @param {String} stateName
 * @param {ControlMap} controlMap
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.add = function(stateName, controlMap) {
  this.stateMap[stateName] = controlMap;
  return this;
};

/**
 * @param {String} newStateName
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.setState = function(newStateName) {
  if (this.stateName === newStateName) return;
  let oldControls = this.stateMap[this.stateName];
  if (oldControls) oldControls.stopListening();

  let newControls = this.stateMap[newStateName];
  if (newControls) newControls.startListening();
  this.stateName = newStateName;
  return this;
};

/**
 * @returns {ControlMap}
 */
PlayerSlot.prototype.getControlMap = function() {
  return this.stateMap[this.stateName];
};

/**
 * @returns {ControlMap}
 */
PlayerSlot.prototype.getControlMapForState = function(stateName) {
  return this.stateMap[stateName];
};

/**
 * @param {Renderer} renderer
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.draw = function(renderer) {
  let c = this.getControlMap();
  if (c) c.draw(renderer);
  return this;
};

/**
 * Releases all the controls in the current state.
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.releaseControls = function() {
  let c = this.getControlMap();
  if (c) c.releaseControls();
  return this;
};

PlayerSlot.prototype.setPointerLockAllowed = function(allowed) {
  this.getControlMap().setPointerLockAllowed(allowed);
};