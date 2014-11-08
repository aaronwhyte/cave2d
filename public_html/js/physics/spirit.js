/**
 * Base class for an entity in the world that does stuff, like manipulating bodies.
 * @param id
 * @constructor
 */
function Spirit(id) {
  this.id = id;
}

/**
 * Every spirit has this called when that spirit enters the world, or when the world first starts up.
 * At this point, a spirit ought to set up an onTimeout, to get its event loop started.
 * @param {World} world
 */
Spirit.prototype.onStart = function(world) {
};

/**
 * Called when the Clock advances to the time of the Timeout.
 * @param {World} world
 * @param {Timeout} timeout  the timeout that the spirit sent to the world.
 */
Spirit.prototype.onTimeout = function(world, timeout) {
};

/**
 * When a Body is hit, the world informs its Spirit, if any.
 * @param {World} world
 * @param {Body} thisBody
 * @param {Body} thatBody
 * @param {WorldEvent} hit
 */
Spirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
};
