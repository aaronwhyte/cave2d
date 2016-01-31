/**
 * A 4D vector, for use as a 3D vector, plus a "w" value to help with
 * 3D matrix transformations.
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 * @param {=number} opt_w
 * @constructor
 */
function Vec4(opt_x, opt_y, opt_z, opt_w) {
  this.v = [0, 0, 0, 1];
  this.reset(opt_x, opt_y, opt_z, opt_w);
}

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 * @param {=number} opt_w
 */
Vec4.prototype.reset = function(opt_x, opt_y, opt_z, opt_w) {
  this.v[0] = opt_x || 0;
  this.v[1] = opt_y || 0;
  this.v[2] = opt_z || 0;
  this.v[3] = (typeof opt_w != 'undefined' ? opt_w : 1);
  return this;
};

Vec4.pool = [];

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_z
 * @param {=number} opt_w
 */
Vec4.alloc = function(opt_x, opt_y, opt_z, opt_w) {
  if (Vec4.pool.length) {
    return Vec4.pool.pop().reset(opt_x, opt_y, opt_z, opt_w);
  }
  return new Vec4(opt_x, opt_y, opt_z, opt_w);
};

Vec4.prototype.free = function() {
  Vec4.pool.push(this);
};

Vec4.ZERO = new Vec4();

Vec4.temp = new Vec4();

/**
 * Transforms this vector by multiplying it by the matrix.
 * @param {Matrix44} matrix
 * @returns {Vec4}
 */
Vec4.prototype.transform = function(matrix) {
  Vec4.temp.reset();
  // In this case we want even "w" to be 0. It will get a 1 if the math works out.
  Vec4.temp.v[3] = 0;
  for (var row = 0; row < 4; row++) {
    for (var col = 0; col < 4; col++) {
      Vec4.temp.v[row] += this.v[col] * matrix.m[col + 4*row];
    }
  }
  return this.set(Vec4.temp);
};

Vec4.prototype.add = function(that) {
  for (var i = 0; i < 3; i++) {
    this.v[i] += that.v[i];
  }
  return this;
};

Vec4.prototype.addXYZ = function(x, y, z) {
  this.v[0] += x;
  this.v[1] += y;
  this.v[2] += z;
  return this;
};

Vec4.prototype.subtract = function(that) {
  for (var i = 0; i < 3; i++) {
    this.v[i] -= that.v[i];
  }
  return this;
};

Vec4.prototype.set = function(that) {
  for (var i = 0; i < 4; i++) {
    this.v[i] = that.v[i];
  }
  return this;
};

Vec4.prototype.setXYZ = function(x, y, z) {
  this.v[0] = x;
  this.v[1] = y;
  this.v[2] = z;
  return this;
};

Vec4.prototype.setRGBA = function(r, g, b, a) {
  this.v[0] = r;
  this.v[1] = g;
  this.v[2] = b;
  this.v[3] = a;
  return this;
};

Vec4.prototype.getX = Vec4.prototype.getR = function() {
  return this.v[0];
};

Vec4.prototype.getY = Vec4.prototype.getG = function() {
  return this.v[1];
};

Vec4.prototype.getZ = Vec4.prototype.getB = function() {
  return this.v[2];
};

Vec4.prototype.getW = Vec4.prototype.getA = function() {
  return this.v[2];
};

Vec4.prototype.scale1 = function(s) {
  for (var i = 0; i < 3; i++) {
    this.v[i] *= s;
  }
  return this;
};

Vec4.prototype.abs = function() {
  for (var i = 0; i < 3; i++) {
    this.v[i] = Math.abs(this.v[i]);
  }
  return this;
};

Vec4.prototype.sign = function() {
  for (var i = 0; i < 3; i++) {
    this.v[i] = Math.sign(this.v[i]);
  }
  return this;
};

Vec4.prototype.dot = function(that) {
  var dot = 0;
  for (var i = 0; i < 3; i++) {
    dot += this.v[i] * that.v[i];
  }
  return dot;
};

Vec4.prototype.magnitudeSquared = function() {
  return this.dot(this);
};

Vec4.prototype.magnitude = function() {
  return Math.sqrt(this.magnitudeSquared());
};

/**
 * Scales to the desired length, or 0 if the vector is {0, 0}
 */
Vec4.prototype.scaleToLength = function(length) {
  var m = this.magnitude();
  if (m) {
    this.scale1(length / m);
  }
  return this;
};

/**
 * If the magnitude is over the max, this scales it down.
 */
Vec4.prototype.clipToMaxLength = function(maxLength) {
  var m = this.magnitude();
  if (m > maxLength) {
    this.scale1(maxLength / m);
  }
  return this;
};

Vec4.prototype.setToInterpolation = function(a, b, t) {
  for (var i = 0; i < 4; i++) {
    this.v[i] = a.v[i] * (1-t) + b.v[i] * t;
  }
  return this;
};


Vec4.prototype.equals = function(that, opt_slop) {
  var slop = opt_slop || 0;
  for (var i = 0; i < 3; i++) {
    if (Math.abs(this.v[i] - that.v[i]) > slop) return false;
  }
  return true;
};

Vec4.prototype.toString = function() {
  return '(' + this.v.join(', ') + ')';
};

Vec4.alongRayDistance = function(startPoint, towardsPoint, distance) {
  return new Vec4()
      .set(towardsPoint)
      .subtract(startPoint)
      .scaleToLength(distance)
      .add(startPoint);
};

Vec4.alongRayFraction = function(startPoint, towardsPoint, fraction) {
  return new Vec4()
      .set(towardsPoint)
      .subtract(startPoint)
      .scale(fraction)
      .add(startPoint);
};

Vec4.midpoint = function(a, b) {
  return new Vec4()
      .set(a)
      .add(b)
      .scale(0.5);
};

Vec4.prototype.projectOnto = function(that) {
  var coef = this.dot(that) / that.dot(that);
  return this.set(that).scale(coef);
};

Vec4.prototype.toJSON = function() {
  return [this.v[0], this.v[1], this.v[2], this.v[3]];
};

Vec4.prototype.setFromJSON = function(json) {
  for (var i = 0; i < 3; i++) {
    this.v[i] = json[i];
  }
};

Vec4.fromJSON = function(json) {
  return new Vec4(json[0], json[1], json[2], json[3]);
};
