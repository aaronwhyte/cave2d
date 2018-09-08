/**
 * Game5 object that keeps track of slot state and turns listeners on and off for state transitions.
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
  this.deathPos = new Vec2d();
  this.respawnPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.timeOfSpawn = -Infinity;
  this.timeOfDeath = -PlayerSlot.DEATH_TIME;
}

PlayerSlot.DEATH_TIME = 50;
PlayerSlot.SPAWN_TIME = 5;

/**
 * @returns {boolean}
 */
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
    this.camera.follow(this.spirit.getBodyPos());
    this.timeOfSpawn = spirit.now();
  }
};

PlayerSlot.prototype.setRespawnPos = function(pos) {
  this.respawnPos.set(pos);
};

/**
 * @param {String} newStateName
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.setState = function(newStateName) {
  if (this.stateName === newStateName) return this;
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
  let c = this.getControlList();
  if (c) c.draw(renderer);
  return this;
};

/**
 * @returns {PlayerSlot}
 */
PlayerSlot.prototype.releaseControls = function() {
  let c = this.getControlList();
  if (c) c.releaseControls();
  return this;
};

/**
 * Call this about once a frame to make the circle follow the camera which follows the spirit
 * @returns {boolean} true if there's a view circle to draw
 */
PlayerSlot.prototype.updateViewCircle = function(now) {
  if (this.spirit) {
    this.camera.follow(this.spirit.getCameraFocusPos());
  }
  this.circle.rad = Game5PlayScreen.PLAYER_VIEW_RADIUS;
  let deathFraction = this.getDeathFraction(now);
  let spawnFraction = this.getSpawnFraction(now);
  if (!this.spirit) {
    let eyeShut = 0.75;
    this.circle.rad *= Math.sin(
        Math.max(0, deathFraction * (2 - eyeShut) - (1 - eyeShut))
        * Math.PI / 2);

    // Use a sinusoid ease-out ease-in slide, but cube it to make the ease-out slower.
    let camSlideFraction = Math.pow(0.5 - Math.cos((1-deathFraction) * Math.PI) / 2, 3);
    this.camera.cameraPos.set(this.deathPos).scale(1 - camSlideFraction)
        .add(this.vec2d.set(this.respawnPos).scale(camSlideFraction));
  } else {
    this.circle.pos.set(this.spirit.getBodyPos());
    this.circle.rad *=
        (1 - Game5PlayScreen.STARTING_VIEW_FRACTION) * Math.sin(spawnFraction * Math.PI /2) +
            Game5PlayScreen.STARTING_VIEW_FRACTION;
  }
  return this.isPlaying() || deathFraction;
};

/**
 * Returns 1 when you die, to 0 when it's time to respawn
 * @param now
 * @returns {number}
 */
PlayerSlot.prototype.getDeathFraction = function(now) {
  return Math.max(0, Math.min(1, 1 - (now - this.timeOfDeath)  / PlayerSlot.DEATH_TIME));
};

/**
 * Returns 0 when you respawn, to 1 some time after.
 * @param now
 * @returns {number}
 */
PlayerSlot.prototype.getSpawnFraction = function(now) {
  return Math.max(0, Math.min(1, (now - this.timeOfSpawn)  / PlayerSlot.SPAWN_TIME));
};

PlayerSlot.prototype.killPlayerAtTime = function(now) {
  if (this.spirit) {
    this.timeOfDeath = now;
    this.deathPos.set(this.camera.cameraPos);
    this.spirit.explode();
    this.spirit = null;
  }
};

PlayerSlot.prototype.setPointerLockAllowed = function(allowed) {
  this.getControlList().setPointerLockAllowed(allowed);
};