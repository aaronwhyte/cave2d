/**
 * This has all the information about a physical body that the collision detector needs,
 * and enough of an API for a Spirit to manipulate a body.
 *
 * @constructor
 */
function Body() {
  this.pathStartPos = new Vec2d();
  this.vel = new Vec2d();

  // The client guarantees that the pathStartTime will be updated within this amount of time,
  // so do not add events for this path beyond pathStartTime + pathDurationMax.
  // Most spirits will accelerate their bodies at a fixed frequency, so this value
  // will not usually change during a body's lifetime unless its spirit changes.
  this.pathDurationMax = Infinity;

  this.rectRad = new Vec2d();

  this.freezePathStartPos = new Vec2d();
  this.freezeVel = new Vec2d();

  this.reset();
}

Body.MAX_ABS_ANGVEL = Math.PI * 1.9;

Body.Shape = {
  CIRCLE: 1,
  RECT: 2
};

Body.pool = [];

Body.alloc = function() {
  if (Body.pool.length) {
    return Body.pool.pop();
  }
  return new Body();
};

Body.prototype.free = function() {
  // reset in free() to clear expensive references like the changeListener, which could be a World
  Body.pool.push(this.reset());
};

Body.prototype.reset = function() {
  this.id = 0;
  this.spiritId = 0;
  this.pathId = 0;

  // The time at which the body was at pathStartPos
  this.pathStartTime = 0;
  this.pathStartPos.reset();
  this.vel.reset();

  // The World's map of Body objects that need to have their paths validated.
  this.invalidBodyIds = null;

  this.shape = Body.Shape.CIRCLE;

  // circle radius
  this.rad = 1;

  // half-width and half-height, for rects
  this.rectRad.reset(1, 1);

  // This controls which other bodies and rayscans should be tested for collisions.
  this.hitGroup = 0;

  // data for the basic "bounce" collision response
  this.mass = 1;
  this.elasticity = 1;
  this.grip = 0;

  // rotation stuff
  this.turnable = false;
  this.moi = 0;
  this.angVel = 0;
  this.angStartTime = 0;
  this.angStartPos = 0;

  // cache for rayscan freeze-unfreeze
  this.freezePathStartPos.reset();
  this.freezeVel.reset();
  this.freezePathStartTime = 0;
  this.freezePathDurationMax = 0;

  this.changeListener = null;

  return this;
};

Body.SCHEMA = {
  0: 'id',
  1: 'spiritId',
  2: 'pathStartTime',
  3: 'pathStartPos',
  4: 'vel',
  5: 'pathDurationMax',
  6: 'shape',
  7: 'rad',
  8: 'rectRad',
  9: 'hitGroup',
  10: 'mass',
  11: 'elasticity',
  12: 'turnable',
  13: 'moi',
  14: 'angVel',
  15: 'angStartTime',
  16: 'angStartPos',
  17: 'grip'
};

Body.getJsoner = function() {
  if (!Body.jsoner) {
    Body.jsoner = new Jsoner(Body.SCHEMA);
  }
  return Body.jsoner;
};

Body.prototype.toJSON = function() {
  return Body.getJsoner().toJSON(this);
};

Body.prototype.setFromJSON = function(json) {
  Body.getJsoner().setFromJSON(json, this);
  return this;
};

Body.prototype.setChangeListener = function(listener) {
  this.changeListener = listener;
};

Body.prototype.onBeforeChange = function() {
  if (this.changeListener) this.changeListener.onBeforeBodyChange(this);
};

/**
 * @param {number} t
 * @param {=Rect} opt_out
 * @returns {Rect}
 */
Body.prototype.getBoundingRectAtTime = function(t, opt_out) {
  var out = opt_out || new Rect();
  this.getPosAtTime(t, out.pos);
  if (this.shape === Body.Shape.CIRCLE) {
    out.setRadXY(this.rad, this.rad);
  } else if (this.shape === Body.Shape.RECT) {
    out.setRad(this.rectRad);
  }
  return out;
};

/**
 * @returns {Number}
 */
Body.prototype.getArea = function() {
  if (this.shape === Body.Shape.CIRCLE) {
    return Math.PI * this.rad * this.rad;
  } else {
    return this.rectRad.x * this.rectRad.y;
  }
};

Body.prototype.invalidatePath = function() {
  if (this.invalidBodyIds && this.id) {
    this.invalidBodyIds[this.id] = true;
  }
};

/**
 * @param {number} t
 * @param {Vec2d} out
 * @returns {Vec2d}
 */
Body.prototype.getPosAtTime = function(t, out) {
  return out.set(this.vel).scale(t - this.pathStartTime).add(this.pathStartPos);
};

/**
 * Shifts the path so it intersects the new position at the new time,
 * without changing the velocity. Teleportation, basically.
 * @param {Vec2d} pos
 * @param {number} t
 */
Body.prototype.setPosAtTime = function(pos, t) {
  // TODO: handle no-op
  this.invalidatePath();
  this.onBeforeChange();
  this.pathStartTime = t;
  this.pathStartPos.set(pos);
};

/**
 * Shifts the path so it intersects the new position at the new time,
 * without changing the velocity. Teleportation, basically.
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
Body.prototype.setPosXYAtTime = function(x, y, t) {
  // TODO handle no-op
  this.invalidatePath();
  this.onBeforeChange();
  this.pathStartTime = t;
  this.pathStartPos.setXY(x, y);
};

/**
 * Shifts the path so that it intersects the same position at time t that it used to,
 * but it arrives with a new velocity (and therefore is coming from and going to new places.)
 * @param {Vec2d} vel
 * @param {number} t
 */
Body.prototype.setVelAtTime = function(vel, t) {
  if (this.vel.equals(vel)) return;
  this.invalidatePath();
  this.onBeforeChange();
  this.moveToTime(t);
  this.vel.set(vel);
};

/**
 * Shifts the path so that it intersects the same position at time t that it used to,
 * but it arrives with a new velocity (and therefore is coming from and going to new places.)
 * @param {Vec2d} vel
 * @param {number} t
 */
Body.prototype.addVelAtTime = function(vel, t) {
  if (vel.isZero()) return;
  this.invalidatePath();
  this.onBeforeChange();
  this.moveToTime(t);
  this.vel.add(vel);
};

/**
 * Shifts the path so that it intersects the same position at time t that it used to,
 * but it arrives with a new velocity (and therefore is coming from and going to new places.)
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
Body.prototype.setVelXYAtTime = function(x, y, t) {
  if (this.vel.x === x && this.vel.y === y) return;
  this.invalidatePath();
  this.onBeforeChange();
  this.moveToTime(t);
  this.vel.setXY(x, y);
};

/**
 * Shifts the path so that it intersects the same position at time t that it used to,
 * but it arrives with a new velocity (and therefore is coming from and going to new places.)
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
Body.prototype.addVelXYAtTime = function(x, y, t) {
  if (this.vel.x === x && this.vel.y === y) return;
  this.invalidatePath();
  this.onBeforeChange();
  this.moveToTime(t);
  this.vel.addXY(x, y);
};

/**
 * @return {number}
 */
Body.prototype.getPathEndTime = function() {
  return this.pathStartTime + this.pathDurationMax;
};

Body.prototype.isMoving = function() {
  return this.angVel !== 0 || !this.vel.isZero();
};

Body.prototype.stopMoving = function(now) {
  this.setAngVelAtTime(0, now);
  this.setVelXYAtTime(0, 0, now);
};

/**
 * Gets the angular position at a given time.
 * @param {number} t
 * @returns {number}
 */
Body.prototype.getAngPosAtTime = function(t) {
  return this.angStartPos + (t - this.angStartTime) * this.angVel;
};

/**
 * Sets the angular position at a given time.
 * @param {number} ap
 * @param {number} t
 */
Body.prototype.setAngPosAtTime = function(ap, t) {
  this.onBeforeChange();
  this.angStartTime = t;
  this.angStartPos = ap;
};

/**
 * Sets the angular velocity at a given time, by rotating the body to the right position at the old velocity first.
 * @param {number} av
 * @param {number} t
 */
Body.prototype.setAngVelAtTime = function(av, t) {
  if (this.angVel === av) return;
  this.onBeforeChange();
  this.moveToTime(t);
  this.angVel = av;
  if (this.angVel > Body.MAX_ABS_ANGVEL) {
    this.angVel = Body.MAX_ABS_ANGVEL;
  } else if (this.angVel < -Body.MAX_ABS_ANGVEL) {
    this.angVel = -Body.MAX_ABS_ANGVEL;
  }
};

Body.prototype.addAngVelAtTime = function(av, t) {
  this.setAngVelAtTime(this.angVel + av, t);
};

Body.prototype.applyLinearFrictionAtTime = function(friction, time) {
  if (this.vel.isZero()) return;
  this.onBeforeChange();
  this.invalidatePath();
  this.moveToTime(time);
  this.vel.scale(1 - friction);
};

Body.prototype.applyAngularFrictionAtTime = function(friction, time) {
  if (!this.angVel) return;
  this.onBeforeChange();
  this.moveToTime(time);
  this.angVel *= 1 - friction;
};

/**
 * Calculates the instantaneous linear velocity of a world point,
 * as if it was attached to the body,
 * taking into account linear and angular velocity
 * @param {number} now
 * @param {Vec2d} point
 * @param {Vec2d} out
 * @returns {Vec2d}
 */
Body.prototype.getVelocityAtWorldPoint = function(now, point, out) {
  if (!this.turnable || !this.angVel) {
    return out.set(this.vel);
  }
  return this.getPosAtTime(now, out).subtract(point).scale(this.angVel).rot90Right().add(this.vel);
};

Body.prototype.applyForceAtWorldPosAndTime = function(force, worldPoint, now) {
  // angular acceleration
  if (this.turnable && this.moi && this.moi !== Infinity) {
    var gripVec = this.getPosAtTime(now, Vec2d.alloc()).subtract(worldPoint);
    var torque = gripVec.cross(force);
    this.setAngVelAtTime(this.angVel + torque / this.moi, now);
    gripVec.free();
  }

  // linear acceleration
  if (this.mass && this.mass !== Infinity) {
    var newVel = Vec2d.alloc()
        .set(force)
        .scale(1 / this.mass)
        .add(this.vel);
    this.setVelAtTime(newVel, now);
    newVel.free();
  }
};

Body.prototype.applyAccelAtWorldPosAndTime = function(accel, worldPoint, now) {
  // angular acceleration
  if (this.turnable) {
    var gripVec = this.getPosAtTime(now, Vec2d.alloc()).subtract(worldPoint);
    var angAccel = gripVec.cross(accel);
    this.setAngVelAtTime(this.angVel + angAccel, now);
    gripVec.free();
  }

  // linear acceleration
  var newVel = Vec2d.alloc()
      .set(accel)
      .add(this.vel);
  this.setVelAtTime(newVel, now);
  newVel.free();
};

/**
 * Without invalidating the path, this sets the pathStartTime to t, and adjusts the pathStartPos.
 * @param {number} t
 */
Body.prototype.moveToTime = function(t) {
  if (this.pathStartTime !== t) {
    var temp = this.getPosAtTime(t, Vec2d.alloc());
    this.pathStartPos.set(temp);
    this.pathStartTime = t;
    temp.free();
  }
  if (this.angStartTime !== t) {
    this.angStartPos = this.getAngPosAtTime(t);
    this.angStartTime = t;
  }
};

Body.prototype.getKineticEnergy = function() {
  return ((0.5 * this.mass * this.vel.magnitudeSquared()) || 0) +
      ((0.5 * this.moi * this.angVel * this.angVel) || 0);
};

/**
 * If a force is applied at a right angle to a line passing through the center of mass, at a distance
 * "forceDist" from the center, what's the inverse of the effective mass?
 * @param forceDist
 * @returns {number}
 */
Body.prototype.getReciprocalMassAlongTangentAtDistance = function(forceDist) {
  var retval = 0;
  if (this.mass && this.mass !== Infinity) {
    retval += 1 / this.mass;
  }
  if (this.turnable && this.moi && this.moi !== Infinity) {
    retval += forceDist * forceDist / this.moi;
  }
  return retval;
};

/**
 *
 * @param {Vec2d} worldPoint
 * @param {Vec2d} dirUnitVec
 * @param {number} now
 * @returns {number}
 */
Body.prototype.getReciprocalMassAtPlaceAndDirAtTime = function(worldPoint, dirUnitVec, now) {
  var retval = 0;
  if (this.mass && this.mass !== Infinity) {
    retval += 1 / this.mass;
  }
  if (this.turnable && this.moi && this.moi !== Infinity) {
    var radial = this.getPosAtTime(now, Vec2d.alloc()).subtract(worldPoint);
    var cross = Math.abs(radial.cross(dirUnitVec));
    retval += cross / this.moi;
    radial.free();
  }
  return retval;
};

/**
 * Freezes a body at a certain time, so it can be rayscanned.
 * @param time
 */
Body.prototype.freezeAtTime = function(time) {
  this.freezePathStartPos.set(this.pathStartPos);
  this.freezeVel.set(this.vel);
  this.freezePathStartTime = this.pathStartTime;
  this.freezePathDurationMax = this.pathDurationMax;

  // update pathStartTime and pathStartPos
  this.moveToTime(time);
  // stop in place
  this.vel.setXY(0, 0);
  // rayscans have a pathDurationMax of 1, so this doesn't need anything higher.
  this.pathDurationMax = 1;
};

Body.prototype.unfreeze = function() {
  this.pathStartPos.set(this.freezePathStartPos);
  this.vel.set(this.freezeVel);
  this.pathStartTime = this.freezePathStartTime;
  this.pathDurationMax = this.freezePathDurationMax;
};

