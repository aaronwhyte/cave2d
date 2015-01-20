/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 * @constructor
 */
function Vec3d(opt_x, opt_y, opt_z) {
  this.reset(opt_x, opt_y, opt_z);
}

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 */
Vec3d.prototype.reset = function(opt_x, opt_y, opt_z) {
  this.x = opt_x || 0;
  this.y = opt_y || 0;
  this.z = opt_z || 0;
  return this;
};

Vec3d.pool = [];

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 */
Vec3d.alloc = function(opt_x, opt_y, opt_z) {
  if (Vec3d.pool.length) {
    return Vec3d.pool.pop().reset(opt_x, opt_y, opt_z);
  }
  return new Vec3d(opt_x, opt_y, opt_z);
};

Vec3d.prototype.free = function() {
  Vec3d.pool.push(this);
};

Vec3d.X = 'x';
Vec3d.Y = 'y';
Vec3d.Z = 'z';

Vec3d.AXES = [Vec3d.X, Vec3d.Y, Vec3d.Z];

Vec3d.ZERO = new Vec3d();

Vec3d.temp = new Vec3d();

/**
 * Transforms this vector by multiplying it by the matrix.
 * @param {Matrix44} matrix
 * @returns {Vec3d}
 */
Vec3d.prototype.transform = function(matrix) {
  Vec3d.temp.reset();
  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < 4; col++) {
      Vec3d.temp[Vec3d.AXES[col]] += this[Vec3d.AXES[row]] * matrix.m[col + 4*row];
    }
  }
  return this.set(Vec3d.temp);
};

Vec3d.prototype.add = function(v) {
  this.x += v.x;
  this.y += v.y;
  this.z += v.z;
  return this;
};

Vec3d.prototype.addXYZ = function(x, y, z) {
  this.x += x;
  this.y += y;
  this.z += z;
  return this;
};

Vec3d.prototype.subtract = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  this.z -= v.z;
  return this;
};

Vec3d.prototype.multiply = function(v) {
  this.x *= v.x;
  this.y *= v.y;
  this.z *= v.z;
  return this;
};

Vec3d.prototype.roundToGrid = function(cellSize) {
  this.x = Math.round(this.x / cellSize);
  this.y = Math.round(this.y / cellSize);
  this.z = Math.round(this.z / cellSize);
  return this.scale(cellSize);
};

Vec3d.prototype.set = function(v) {
  this.x = v.x;
  this.y = v.y;
  this.z = v.z;
  return this;
};

Vec3d.prototype.setXYZ = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  return this;
};

Vec3d.prototype.scale1 = function(s) {
  this.x *= s;
  this.y *= s;
  this.z *= s;
  return this;
};

Vec3d.prototype.scaleXYZ = function(sx, sy, sz) {
  this.x *= sx;
  this.y *= sy;
  this.z *= sz;
  return this;
};

Vec3d.prototype.abs = function() {
  this.x = Math.abs(this.x);
  this.y = Math.abs(this.y);
  this.y = Math.abs(this.z);
  return this;
};

Vec3d.prototype.sign = function() {
  this.x = Math.sign(this.x);
  this.y = Math.sign(this.y);
  this.z = Math.sign(this.z);
  return this;
};

Vec3d.prototype.rotateAboutAxis = function(axis, rads) {
  if (!rads) {
    // no rotation
    return this;
  }
  var sin = Math.sin(rads);
  var cos = Math.cos(rads);
  var nx = cos * this.x + sin * this.y;
  var ny = -sin * this.x + cos * this.y;
  this.x = nx;
  this.y = ny;
  return this;
};

Vec3d.prototype.dot = function(that) {
  return this.x * that.x + this.y * that.y;
};

Vec3d.dotXYZXYZ = function(x0, y0, z0, x1, y1, z1) {
  return x0 * x1 + y0 * y1 + z0 * z1;
};

Vec3d.prototype.magnitudeSquared = function() {
  return this.x * this.x + this.y * this.y + this.z * this.z;
};

Vec3d.prototype.magnitude = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
};

Vec3d.prototype.distanceSquared = function(that) {
  var dx = this.x - that.x;
  var dy = this.y - that.y;
  var dz = this.z - that.z;
  return dx * dx + dy * dy + dz * dz;
};

Vec3d.prototype.distance = function(that) {
  var dx = this.x - that.x;
  var dy = this.y - that.y;
  var dz = this.z - that.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Scales to the desired length, or 0 if the vector is {0, 0}
 */
Vec3d.prototype.scaleToLength = function(length) {
  var m = this.magnitude();
  if (m) {
    this.scale(length / m);
  }
  return this;
};

/**
 * If the magnitude is over the max, this scales it down.
 */
Vec3d.prototype.clipToMaxLength = function(maxLength) {
  var m = this.magnitude();
  if (m > maxLength) {
    this.scale(maxLength / m);
  }
  return this;
};

Vec3d.prototype.slideByFraction = function(towardsPoint, fraction) {
  this.x = this.x * (1 - fraction) + towardsPoint.x * fraction;
  this.y = this.y * (1 - fraction) + towardsPoint.y * fraction;
  this.z = this.z * (1 - fraction) + towardsPoint.z * fraction;
};


Vec3d.prototype.equals = function(v, opt_slop) {
  var slop = opt_slop || 0;
  return this.x - v.x <= slop &&
      this.y - v.y <= slop &&
      this.z - v.z <= slop;
};

Vec3d.prototype.isZero = function() {
  return this.x == 0 && this.y == 0 && this.z == 0;
};

Vec3d.prototype.toString = function() {
  return '(' + this.x + ', ' + this.y + ', ' + this.z + ')';
};

Vec3d.alongRayDistance = function(startPoint, towardsPoint, distance) {
  return new Vec3d()
      .set(towardsPoint)
      .subtract(startPoint)
      .scaleToLength(distance)
      .add(startPoint);
};

Vec3d.alongRayFraction = function(startPoint, towardsPoint, fraction) {
  return new Vec3d()
      .set(towardsPoint)
      .subtract(startPoint)
      .scale(fraction)
      .add(startPoint);
};

Vec3d.midpoint = function(a, b) {
  return new Vec3d()
      .set(a)
      .add(b)
      .scale(0.5);
};

Vec3d.prototype.projectOnto = function(that) {
  var coef = this.dot(that) / that.dot(that);
  return this.set(that).scale(coef);
};

Vec3d.prototype.toJSON = function() {
  return [this.x, this.y, this.z];
};

Vec3d.fromJSON = function(json) {
  return new Vec3d(json[0], json[1], json[2]);
};
