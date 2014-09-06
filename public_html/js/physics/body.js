
function Body(id, spiritId) {
  this.pathStartPos = Vec2d.alloc();
  this.vel = Vec2d.alloc();
  this.reset(id, spiritId);
}

Body.Shape = {
  CIRCLE: 1,
  RECT: 2
};

Body.pool = [];
Body.poolSize = 0;

Body.prototype.reset = function(id, spiritId) {
  this.id = id;
  this.spiritId = spiritId || 0;

  this.pathId = 0;
  this.pathStartTime = Infinity;
  this.pathStartPos.reset();
  this.vel.reset();
  this.pathEndTime = -Infinity;

  this.shape = Body.Shape.CIRCLE;
  this.rad = 0;
  this.radX = 0;
  this.radY = 0;

  this.hitgroup = 0;
  this.mass = 0;
  this.elasticity = 0;
};

/**
 * @param {number=} id
 * @param {number=} spiritId
 */
Body.alloc = function(id, spiritId) {
  var retval;
  if (Body.poolSize) {
    retval = Body.pool[--Body.poolSize];
    retval.reset(id, spiritId);
  } else {
    retval = new Body(id, spiritId);
  }
  return retval;
};

Body.free = function(o) {
  Body.pool[Body.poolSize++] = o;
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
 * @param {number} t
 * @param {Rect} out
 * @returns {Rect}
 */
Body.prototype.getBoundingRectAtTime = function(t, out) {
  this.getPosAtTime(t, out.pos);
  if (this.shape == Body.Shape.CIRCLE) {
    out.setRadXY(this.rad, this.rad);
  } else if (this.shape == Body.Shape.RECT) {
    out.setRadXY(this.radX, this.radY);
  }
  return out;
};

Body.prototype.invalidatePath = function() {
  this.pathId = 0;
};

Body.prototype.setPosAtTime = function(pos, t) {
  this.invalidatePath();
  this.pathStartTime = t;
  this.pathStartPos.set(pos);
};

Body.prototype.setVelAtTime = function(vel, t) {
  this.invalidatePath();
  this.moveToTime(t);
  this.vel.set(vel);
};

/**
 * Without invalidating the path, this sets the pathStartTime to t, and adjusts the pathStartPos.
 * @param {number} t
 */
Body.prototype.moveToTime = function(t) {
  if (this.pathStartTime === t) return;
  var temp = this.getPosAtTime(Vec2d.alloc());
  this.pathStartPos.set(temp);
  this.pathStartTime = t;
  Vec2d.free(temp);
};

