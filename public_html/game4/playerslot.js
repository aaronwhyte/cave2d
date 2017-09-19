/**
 * Game4 object that keeps track of slot state and turns listeners on and off for state transitions.
 * @param {String} name Unique slot name, which should be stable across levels.
 * @constructor
 */
function PlayerSlot(name) {
  this.name = name;
  this.stateMap = {};
  this.stateName = null;
  this.spirit = null;
  this.circle = new Circle();
  this.camera = new Camera(0.1, 0.4, 7);
}

PlayerSlot.prototype.isPlaying = function() {
  return this.stateName !== ControlState.WAITING;
};

/**
 * @param {String} stateName
 * @param {ControlMap} controlList
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.add = function(stateName, controlList) {
  this.stateMap[stateName] = controlList;
  return this;
};

PlayerSlot.prototype.setSpirit = function(spirit) {
  this.spirit = spirit;
  if (spirit) {
    this.camera.set(this.spirit.getBodyPos());
  }
};

/**
 * @param {String} newStateName
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.setState = function(newStateName) {
  if (this.stateName === newStateName) return;
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

/**
 * Call this about once a frame to make the circle follow the camera which follows the spirit
 * @returns {boolean} true if there's a view circle to draw
 */
PlayerSlot.prototype.updateViewCircle = function() {
  if (!this.isPlaying() || !this.spirit) {
    // TODO: keep circle for a short while after a player drops
    // TODO: fancy circle shrink-n-slide right after player dies
    return false;
  }
  this.camera.follow(this.spirit.getBodyPos());
  this.circle.pos.set(this.camera.cameraPos);
  this.circle.rad = Game4PlayScreen.PLAYER_VIEW_RADIUS;
  return true;
};

PlayerSlot.prototype.killPlayerWithRespawn = function() {
  console.log('IMPLEMENT killPlayerWithRespawn');
};