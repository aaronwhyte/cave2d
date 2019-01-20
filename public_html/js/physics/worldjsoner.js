/**
 * @constructor
 */
function WorldJsoner() {
  this.isBodySerializableFn = function(body) {
    return true;
  };
  this.serializeTimeouts = true;
}

/**
 * Usually walls are serialized separately by BitGrid, so use this to detect and cull them.
 * By default, every body gets serialized
 * @param {Function} fn takes a body and returns a boolean
 */
WorldJsoner.prototype.setIsBodySerializableFn = function(fn) {
  this.isBodySerializableFn = fn;
};

/**
 * @param {World} world
 * @param {Object} json
 */
WorldJsoner.prototype.loadWorldFromJson = function(world, json) {
  let i;
  world.now = json.now;

  // bodies
  let lostSpiritIdToBodyId = {};
  for (i = 0; i < json.bodies.length; i++) {
    let bodyJson = json.bodies[i];
    let body = new Body();
    body.setFromJSON(bodyJson);
    world.loadBody(body);
    lostSpiritIdToBodyId[body.spiritId] = body.id;
  }
  // spirits
  for (i = 0; i < json.spirits.length; i++) {
    let spirit = world.createSpiritFromJson(json.spirits[i]);
    if (spirit) {
      world.loadSpirit(spirit);
      delete lostSpiritIdToBodyId[spirit.id];
    }
  }
  // timeouts
  let e = new WorldEvent();
  if (json.timeouts) {
    for (i = 0; i < json.timeouts.length; i++) {
      e.setFromJSON(json.timeouts[i]);
      world.loadTimeout(e);
    }
  }
  // Stop spiritless bodies from haunting the world.
  // This can happen if there are obsolete spirits in a level.
  for (let spiritId in lostSpiritIdToBodyId) {
    let bodyId = lostSpiritIdToBodyId[spiritId];
    world.removeBodyId(bodyId);
  }
};

WorldJsoner.prototype.worldToJson = function(world) {
  let json = {
    now: world.now,
    bodies: [],
    spirits: [],
    timeouts: []
  };
  // bodies
  for (let bodyId in world.bodies) {
    let body = world.bodies[bodyId];
    if (this.isBodySerializableFn(body)) {
      json.bodies.push(body.toJSON());
    }
  }
  // spirits
  for (let spiritId in world.spirits) {
    let spirit = world.spirits[spiritId];
    json.spirits.push(spirit.toJSON());
  }
  // timeouts
  if (this.serializeTimeouts) {
    for (let e = world.queue.getFirst(); e; e = e.next[0]) {
      if (e.type === WorldEvent.TYPE_TIMEOUT) {
        json.timeouts.push(e.toJSON());
      }
    }
  }
  return json;
};

/**
 * Deprecated hack to reduce precision of velocities, to shrink the body JSON a bit.
 * @param {World} world
 * @param {Number} roundTo
 */
WorldJsoner.prototype.roundBodyVelocities = function(world, roundTo) {
  let vec2d = new Vec2d();
  for (let bodyId in world.bodies) {
    let body = world.bodies[bodyId];
    if (this.isBodySerializableFn(body)) {
      vec2d.set(body.vel).roundToGrid(roundTo);
      body.setVelAtTime(vec2d, world.now);
    }
  }
};

