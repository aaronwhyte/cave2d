/**
 * @constructor
 */
function Matrix44() {
  // (0,0), (1,0), (2,0), (3,0), (0,1), (1,0)...
  this.m = [];
  this.reset();
}

Matrix44.IDENTITY_ARRAY = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1];

/**
 * Start as the the identity matrix.
 * @returns {Matrix44}
 */
Matrix44.prototype.reset = function() {
  return this.toIdentity();
};

Matrix44.pool = [];

Matrix44.alloc = function() {
  if (Matrix44.pool.length) {
    return Matrix44.pool.pop().reset();
  }
  return new Matrix44();
};

Matrix44.prototype.free = function() {
  Matrix44.pool.push(this);
};

Matrix44.prototype.toIdentity = function() {
  for (var i = 0; i < 16; i++) {
    this.m[i] = Matrix44.IDENTITY_ARRAY[i];
  }
  return this;
};

Matrix44.prototype.toTranslateOp = function(vec3d) {
  this.toIdentity();
  for (var row = 0; row < 3; row++) {
    this.m[3 + 4 * row] = vec3d[Vec3d.AXES[row]];
  }
  return this;
};

Matrix44.prototype.toScaleOp = function(vec3d) {
  this.toIdentity();
  for (var xy = 0; xy < 3; xy++) {
    this.m[5 * xy] = vec3d[Vec3d.AXES[xy]];
  }
  return this;
};

/**
 * Right-handed rotation clockwise as you look from the origin to positive-X.
 * @param {number} angle
 * @returns {Matrix44}
 */
Matrix44.prototype.toRotateXOp = function(angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  this.toIdentity();
  this.setColRowVal(1, 1, cos);
  this.setColRowVal(2, 1, sin);
  this.setColRowVal(1, 2, -sin);
  this.setColRowVal(2, 2, cos);
  return this;
};

/**
 * Right-handed rotation clockwise as you look from the origin to positive-Y.
 * @param {number} angle
 * @returns {Matrix44}
 */
Matrix44.prototype.toRotateYOp = function(angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  this.toIdentity();
  this.setColRowVal(0, 0, cos);
  this.setColRowVal(2, 0, -sin);
  this.setColRowVal(0, 2, sin);
  this.setColRowVal(2, 2, cos);
  return this;
};

/**
 * Right-handed rotation clockwise as you look from the origin to positive-Z.
 * @param {number} angle
 * @returns {Matrix44}
 */
Matrix44.prototype.toRotateZOp = function(angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  this.toIdentity();
  this.setColRowVal(0, 0, cos);
  this.setColRowVal(1, 0, sin);
  this.setColRowVal(0, 1, -sin);
  this.setColRowVal(1, 1, cos);
  return this;
};

Matrix44.prototype.setColRowVal = function(col, row, val) {
  this.m[col + 4 * row] = val;
};

Matrix44.prototype.getColRowVal = function(col, row) {
  return this.m[col + 4 * row];
};

/**
 * Mutates this matrix by multiplying it by that one.
 * @param {Matrix44} that
 * @return {Matrix44} this, mutated
 */
Matrix44.prototype.multiply = function(that) {
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      var val = 0;
      for (var i = 0; i < 4; i++) {
        val += this.m[i + 4*y] * that.m[x + 4*i];
      }
      this.m[x + 4*y] = val;
    }
  }
  return this;
};

Matrix44.prototype.set = function(that) {
  for (var i = 0; i < 16; i++) {
    this.m[i] = that.m[i];
  }
  return this;
};

Matrix44.prototype.equals = function(that, opt_slop) {
  var slop = opt_slop || 0;
  for (var i = 0; i < 16; i++) {
    if (Math.abs(this.m[i] - that.m[i]) > slop) return false;
  }
  return true;
};

Matrix44.prototype.toString = function() {
  return JSON.stringify(this.m);
};

Matrix44.prototype.toJSON = function() {
  return this.m.concat();
};

Matrix44.fromJSON = function(json) {
  return (new Matrix44()).set(json);
};
