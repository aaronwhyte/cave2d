/**
 * @constructor
 * @extends {Spirit}
 */
function BaseSpirit(screen) {
  Spirit.call(this);

  this.tempBodyPos = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();

  // activation input/output...

  // Source maintains map from target spirit IDs to output values to those targets, in case source gets polled.
  this.outputIdsToVals = {};
  // Target maintains set of source spirit IDs, for polling.
  this.inputIds = {};
  // Target also maintains map from pulse input end time to pulse input value.
  this.pulseEndToVal = {};

  this.lastThumpSoundTime = 0;

  BaseSpirit.prototype.reset.call(this, screen);
}
BaseSpirit.prototype = new Spirit();
BaseSpirit.prototype.constructor = BaseSpirit;

BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME = 1;

BaseSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
BaseSpirit.STOPPING_ANGVEL = 0.01;


BaseSpirit.prototype.reset = function(screen) {
  this.screen = screen;

  // Violate Law of Demeter here :-/
  if (this.screen) {
    this.stamps = this.screen.stamps;
    this.sounds = this.screen.sounds;
  }

  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.tempBodyPos.reset();

  // energy
  this.energyCapacity = 0;
  this.energy = 0;

  // combat
  this.team = Team.NEUTRAL;
  this.health = 1;

  // harmless and invulnerable
  this.toughness = Infinity;
  this.damage = 0;
};

BaseSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BaseSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BaseSpirit.prototype.maybeStop = function() {
  let body = this.getBody();
  if (!body) return;
  let oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < AntSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  let oldVelMagSq = body.vel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < AntSpirit.STOPPING_SPEED_SQUARED) {
    this.setBodyVel(Vec2d.ZERO);
  }
};

/**
 * @param group
 * @param pos
 * @param dir
 * @param dist
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scan = function(group, pos, dir, dist, rad) {
  return this.screen.scan(
      group,
      pos,
      this.scanVec.setXY(
          Math.sin(dir) * dist,
          Math.cos(dir) * dist),
      rad,
      this.scanResp);
};

/**
 * @param group
 * @param pos
 * @param vel
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scanWithVel = function(group, pos, vel, rad) {
  return this.screen.scan(
      group,
      pos,
      vel,
      rad,
      this.scanResp);
};

BaseSpirit.prototype.getScanHitBody = function() {
  return this.screen.world.getBodyByPathId(this.scanResp.pathId);
};

BaseSpirit.prototype.getScanHitSpirit = function() {
  var body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

BaseSpirit.prototype.getBody = function() {
  return this.screen.world.bodies[this.bodyId];
};

BaseSpirit.prototype.getBodyPos = function() {
  var body = this.getBody();
  return body ? body.getPosAtTime(this.now(), this.tempBodyPos) : null;
};

BaseSpirit.prototype.setBodyVel = function(v) {
  var body = this.getBody();
  return body ? body.setVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.addBodyVel = function(v) {
  var body = this.getBody();
  return body ? body.addVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.getBodyAngPos = function() {
  var body = this.getBody();
  return body ? body.getAngPosAtTime(this.now()) : null;
};

BaseSpirit.prototype.setBodyAngPos = function(ap) {
  var body = this.getBody();
  if (body) {
    body.setAngPosAtTime(ap, this.now());
  }
};

BaseSpirit.prototype.getBodyAngVel = function() {
  var body = this.getBody();
  return body ? body.angVel : null;
};

BaseSpirit.prototype.setBodyAngVel = function(av) {
  var body = this.getBody();
  if (body) {
    return body.setAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.addBodyAngVel = function(av) {
  var body = this.getBody();
  if (body) {
    return body.addAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.now = function() {
  return this.screen.now();
};

BaseSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? Game4PlayScreen.FRICTION : 0.3;
};

BaseSpirit.prototype.getAngleToBody = function(body) {
  var thisPos = this.getBodyPos();
  var thatPos = body.getPosAtTime(this.now(), Vec2d.alloc());
  var p = thatPos.subtract(thisPos);
  var angle = p.angle();
  thatPos.free();
  return angle;
};

BaseSpirit.prototype.getAngleDiff = function(toAngle) {
  var angleDiff = toAngle - this.getBodyAngPos();
  while (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  }
  while (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  return angleDiff;
};


//////////////////////////
// Input/Output
//////////////////////////

BaseSpirit.prototype.isActivatable = function() {
  return false;
};

/**
 * Adds an output source spirit to this target spirit, so this target can poll it.
 * @param sourceSpiritId
 */
BaseSpirit.prototype.addInputSource = function(sourceSpiritId) {
  this.inputIds[sourceSpiritId] = true;
  this.onInputSumUpdate();
};

/**
 * @param sourceSpiritId
 */
BaseSpirit.prototype.isInputSource = function(sourceSpiritId) {
  return !!this.inputIds[sourceSpiritId];
};

/**
 * Removes an output source spirit from this target spirit.
 * @param sourceSpiritId
 */
BaseSpirit.prototype.removeInputSource = function(sourceSpiritId) {
  delete this.inputIds[sourceSpiritId];
  this.onInputSumUpdate();
};

/**
 * Tells this target spirit that a source's input value has changed.
 * Override this to do something useful.
 * @param sourceSpiritId
 * @param val
 */
BaseSpirit.prototype.onInputChanged = function(sourceSpiritId, val) {
  // Usually the impl will re-evaluate all inputs to decide what to do,
  // but I'm including the actual new val too in case.
  this.onInputSumUpdate();
};

/**
 * @param targetId
 * @returns {*|number} this spirit's output to the target
 */
BaseSpirit.prototype.getOutputToTarget = function(targetId) {
  return this.outputIdsToVals[targetId];
};

BaseSpirit.prototype.addInputPulse = function(endTime, val) {
  if (this.pulseEndToVal[endTime]) {
    this.pulseEndToVal[endTime] += val;
  } else {
    this.pulseEndToVal[endTime] = val;
  }
  this.onInputSumUpdate();
};

BaseSpirit.prototype.onInputSumUpdate = function() {
  // maybe something changed?
};

BaseSpirit.prototype.sumOfInputs = function() {
  var sum = 0;
  for (var sourceId in this.inputIds) {
    var sourceSpirit = this.screen.getSpiritById(sourceId);
    if (sourceSpirit) {
      sum += sourceSpirit.getOutputToTarget(this.id) || 0;
    } else {
      delete this.inputIds[sourceId];
    }
  }
  var now = this.now();
  for (var endTime in this.pulseEndToVal) {
    if (endTime >= now) {
      sum += this.pulseEndToVal[endTime];
    } else {
      delete this.pulseEndToVal[endTime];
    }
  }
  return sum;
};


///////////
// ENERGY
///////////

/**
 * This might cause the amount of energy in the spirit to decrease, if it's higher
 * than the new capacity.
 * @param {number} newCapacity
 * @returns {number} The amount of energy lost due to overflow.
 */
BaseSpirit.prototype.setEnergyCapacity = function(newCapacity) {
  this.energyCapacity = newCapacity;
  return this.setEnergy(this.energy);
};

BaseSpirit.prototype.getEnergyCapacity = function() {
  return this.energyCapacity;
};

/**
 * @param {number} e
 * @returns {number} the amount of requested energy that was *not* added.
 * If the energy added would have caused the spirit to go over capacity,
 * then this will be positive. If it was cause energy to go below zero, this will
 * be negative. Otherwise this will be zero.
 */
BaseSpirit.prototype.setEnergy = function(e) {
  var newEnergy = Math.max(0, Math.min(this.energyCapacity, e));
  var overflow = e - newEnergy;
  this.energy = newEnergy;
  return overflow;
};

BaseSpirit.prototype.getEnergy = function() {
  return this.energy;
};

/**
 * @param {number} e
 * @returns {number} the amount of requested energy that was *not* added.
 * If the energy added would have caused the spirit to go over capacity,
 * then this will be positive. If it was cause energy to go below zero, this will
 * be negative. Otherwise this will be zero.
 */
BaseSpirit.prototype.addEnergy = function(e) {
  return this.setEnergy(this.energy + e);
};

BaseSpirit.prototype.damagesTeam = function(otherTeam) {
  if (!this.damage) return false;
  return (this.team === Team.PLAYER && otherTeam === Team.ENEMY) ||
      (this.team === Team.ENEMY && otherTeam === Team.PLAYER) ||
      (this.team === Team.NEUTRAL);
};

BaseSpirit.prototype.applyDamage = function(damage) {
  this.health -= damage / this.toughness;
  if (this.health <= 0) {
    this.die();
  }
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
BaseSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  // Override me!
  var body = this.getBody();
  if (!body) return;
  var now = this.now();
  if (this.lastThumpSoundTime + BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME < this.now()) {
    this.screen.sounds.wallThump(this.getBodyPos(), mag);
  }
  this.lastThumpSoundTime = now;
};
