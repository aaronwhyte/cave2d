/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @constructor
 */
function Vec2d(opt_x, opt_y) {
  this.reset(opt_x, opt_y);
}


Vec2d.prototype.debugIfNaN = function() {
  if (isNaN(this.x) || isNaN(this.y)) debugger;
};

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 */
Vec2d.prototype.reset = function(opt_x, opt_y) {
  this.x = opt_x || 0;
  this.y = opt_y || 0;
  return this;
};

Vec2d.pool = [];

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 */
Vec2d.alloc = function(opt_x, opt_y) {
  if (Vec2d.pool.length) {
    return Vec2d.pool.pop().reset(opt_x, opt_y);
  }
  return new Vec2d(opt_x, opt_y);
};

Vec2d.prototype.free = function() {
  Vec2d.pool.push(this);
};

Vec2d.X = 'x';
Vec2d.Y = 'y';

Vec2d.AXES = [Vec2d.X, Vec2d.Y];

Vec2d.ZERO = new Vec2d(0, 0);

Vec2d.otherAxis = function(axis) {
  return axis === Vec2d.X ? Vec2d.Y : Vec2d.X;
};

/**
 * @param {Vec2d} v
 * @return {Vec2d}
 */
Vec2d.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};

/**
 * @param {number} x
 * @param {number} y
 * @returns {Vec2d}
 */
Vec2d.prototype.addXY = function(x, y) {
  this.x += x;
  this.y += y;
  return this;
};

/**
 * @param {Vec2d} v
 * @returns {Vec2d}
 */
Vec2d.prototype.subtract = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};

/**
 * @param {Vec2d} v
 * @returns {Vec2d}
 */
Vec2d.prototype.multiply = function(v) {
  this.x *= v.x;
  this.y *= v.y;
  return this;
};

Vec2d.prototype.roundToGrid = function(cellSize) {
  this.x = Math.round(this.x / cellSize);
  this.y = Math.round(this.y / cellSize);
  return this.scale(cellSize);
};

Vec2d.prototype.set = function(v) {
  this.x = v.x;
  this.y = v.y;
  return this;
};

Vec2d.prototype.setXY = function(xx, yy) {
  this.x = xx;
  this.y = yy;
  return this;
};

Vec2d.prototype.scale = function(s) {
  this.x *= s;
  this.y *= s;
  return this;
};

Vec2d.prototype.scaleXY = function(sx, sy) {
  this.x *= sx;
  this.y *= sy;
  return this;
};

Vec2d.prototype.abs = function() {
  this.x = Math.abs(this.x);
  this.y = Math.abs(this.y);
  return this;
};

Vec2d.prototype.sign = function() {
  this.x = Math.sign(this.x);
  this.y = Math.sign(this.y);
  return this;
};

/**
 * @returns {number} up (0, 1) is 0, right (0, 1) is PI/2
 */
Vec2d.prototype.angle = function() {
  return Math.atan2(this.x, this.y);
};

Vec2d.prototype.rot90Right = function() {
  let tmp = this.x;
  this.x = -this.y;
  this.y = tmp;
  return this;
};

Vec2d.prototype.rot = function(rads) {
  if (!rads) {
    // no rotation
    return this;
  }
  let sin = Math.sin(rads);
  let cos = Math.cos(rads);
  let nx = cos * this.x + sin * this.y;
  let ny = -sin * this.x + cos * this.y;
  this.x = nx;
  this.y = ny;
  return this;
};

Vec2d.prototype.dot = function(that) {
  return this.x * that.x + this.y * that.y;
};

Vec2d.dotXYXY = function(x0, y0, x1, y1) {
  return x0 * x1 + y0 * y1;
};

Vec2d.prototype.cross = function(that) {
  return this.x * that.y - that.x * this.y;
};

Vec2d.crossXYXY = function(x0, y0, x1, y1) {
  return x0 * y1 - x1 * y0;
};

Vec2d.prototype.magnitudeSquared = function() {
  return this.x * this.x + this.y * this.y;
};

Vec2d.prototype.magnitude = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vec2d.prototype.distanceSquared = function(that) {
  let dx = this.x - that.x;
  let dy = this.y - that.y;
  return dx * dx + dy * dy;
};

Vec2d.prototype.distance = function(that) {
  let dx = this.x - that.x;
  let dy = this.y - that.y;
  return Math.sqrt(dx * dx + dy * dy);
};

Vec2d.magnitude = function(x, y) {
  return Math.sqrt(x * x + y * y);
};

/**
 * Scales to the desired length, or 0 if the vector is {0, 0}
 */
Vec2d.prototype.scaleToLength = function(length) {
  let m = this.magnitude();
  if (m) {
    this.scale(length / m);
  }
  return this;
};

/**
 * If the magnitude is over the max, this scales it down.
 */
Vec2d.prototype.clipToMaxLength = function(maxLength) {
  let m = this.magnitude();
  if (m > maxLength) {
    this.scale(maxLength / m);
  }
  return this;
};

Vec2d.prototype.slideByFraction = function(towardsPoint, fraction) {
  this.x = this.x * (1 - fraction) + towardsPoint.x * fraction;
  this.y = this.y * (1 - fraction) + towardsPoint.y * fraction;
  return this;
};


Vec2d.prototype.equals = function(v) {
  return (this.x === v.x && this.y === v.y);
};

Vec2d.prototype.isZero = function() {
  return this.x === 0 && this.y === 0;
};

Vec2d.prototype.toString = function() {
  return '(' + this.x + ', ' + this.y + ')';
};

Vec2d.dirs = [
  new Vec2d(0, -1),
  new Vec2d(1, -1),
  new Vec2d(1, 0),
  new Vec2d(1, 1),
  new Vec2d(0, 1),
  new Vec2d(-1, 1),
  new Vec2d(-1, 0),
  new Vec2d(-1, -1)
];

// static func
Vec2d.randDir = function() {
  let dir = Vec2d.dirs[Math.floor(Math.random()*8)];
  return new Vec2d(dir.x, dir.y);
};

Vec2d.alongRayDistance = function(startPoint, towardsPoint, distance) {
  return new Vec2d()
      .set(towardsPoint)
      .subtract(startPoint)
      .scaleToLength(distance)
      .add(startPoint);
};

Vec2d.alongRayFraction = function(startPoint, towardsPoint, fraction) {
  return new Vec2d()
      .set(towardsPoint)
      .subtract(startPoint)
      .scale(fraction)
      .add(startPoint);
};

Vec2d.midpoint = function(a, b) {
  return new Vec2d()
      .set(a)
      .add(b)
      .scale(0.5);
};

Vec2d.distance = function(x0, y0, x1, y1) {
  let dx = x0 - x1;
  let dy = y0 - y1;
  return Math.sqrt((dx * dx) + (dy * dy));
};

Vec2d.distanceSq = function(x0, y0, x1, y1) {
  let dx = x0 - x1;
  let dy = y0 - y1;
  return (dx * dx) + (dy * dy);
};

Vec2d.prototype.projectOnto = function(that) {
  let denom = that.dot(that);
  let coef;
  if (denom) {
    coef = this.dot(that) / denom;
    return this.set(that).scale(coef);
  } else {
    return this;
  }
};

Vec2d.prototype.toJSON = function() {
  return [this.x, this.y];
};

Vec2d.prototype.setFromJSON = function(json) {
  if (!json) return;
  this.x = json[0];
  this.y = json[1];
};

Vec2d.fromJSON = function(json) {
  return new Vec2d(json[0], json[1]);
};
