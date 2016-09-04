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

Body.Shape = {
  CIRCLE: 1,
  RECT: 2
};

Body.pool = [];

Body.alloc = function() {
  if (Body.pool.length) {
    return Body.pool.pop().reset();
  }
  return new Body();
};

Body.prototype.free = function() {
  Body.pool.push(this);
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

  // rotation stuff
  this.turnable = false;
  this.moi = 1;
  this.angVel = 0;
  this.angStartTime = 0;
  this.angStartPos = 0;

  // cache for rayscan freeze-unfreeze
  this.freezePathStartPos.reset();
  this.freezeVel.reset();
  this.freezePathStartTime = 0;
  this.freezePathDurationMax = 0;

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
  16: 'angStartPos'
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
};

/**
 * @param {number} t
 * @param {=Rect} opt_out
 * @returns {Rect}
 */
Body.prototype.getBoundingRectAtTime = function(t, opt_out) {
  var out = opt_out || new Rect();
  this.getPosAtTime(t, out.pos);
  if (this.shape == Body.Shape.CIRCLE) {
    out.setRadXY(this.rad, this.rad);
  } else if (this.shape == Body.Shape.RECT) {
    out.setRad(this.rectRad);
  }
  return out;
};

/**
 * @returns {Number}
 */
Body.prototype.getArea = function() {
  if (this.shape == Body.Shape.CIRCLE) {
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
  this.invalidatePath();
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
  this.invalidatePath();
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
  this.invalidatePath();
  this.moveToTime(t);
  this.vel.set(vel);
};

/**
 * Shifts the path so that it intersects the same position at time t that it used to,
 * but it arrives with a new velocity (and therefore is coming from and going to new places.)
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
Body.prototype.setVelXYAtTime = function(x, y, t) {
  this.invalidatePath();
  this.moveToTime(t);
  this.vel.setXY(x, y);
};

/**
 * @return {number}
 */
Body.prototype.getPathEndTime = function() {
  return this.pathStartTime + this.pathDurationMax;
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
  this.angStartTime = t;
  this.angStartPos = ap;
};

/**
 * Sets the angular velocity at a given time, by rotating the body to the right position at the old velocity first.
 * @param {number} av
 * @param {number} t
 */
Body.prototype.setAngVelAtTime = function(av, t) {
  this.moveToTime(t);
  this.angVel = av;
};

/**
 * Without invalidating the path, this sets the pathStartTime to t, and adjusts the pathStartPos.
 * @param {number} t
 */
Body.prototype.moveToTime = function(t) {
  if (this.pathStartTime === t) return;
  var temp = this.getPosAtTime(t, Vec2d.alloc());
  this.pathStartPos.set(temp);
  this.pathStartTime = t;
  temp.free();

  this.angStartPos = this.getAngPosAtTime(t);
  this.angStartTime = t;
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

