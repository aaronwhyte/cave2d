/**
 * @constructor
 */
function Matrix33() {
  // (0,0), (1,0), (2,0), (0,1), (1,0)...
  this.m = [];
  this.reset();
}

Matrix33.IDENTITY_ARRAY = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1];

Matrix33.tempArray = [
  0, 0, 0,
  0, 0, 0,
  0, 0, 0];

/**
 * Start as the the identity matrix.
 * @returns {Matrix33}
 */
Matrix33.prototype.reset = function() {
  return this.toIdentity();
};

Matrix33.pool = [];

Matrix33.alloc = function() {
  if (Matrix33.pool.length) {
    return Matrix33.pool.pop().reset();
  }
  return new Matrix33();
};

Matrix33.prototype.free = function() {
  Matrix33.pool.push(this);
};

Matrix33.prototype.toIdentity = function() {
  for (var i = 0; i < 9; i++) {
    this.m[i] = Matrix33.IDENTITY_ARRAY[i];
  }
  return this;
};

Matrix33.prototype.setColRowVal = function(col, row, val) {
  this.m[col + 3 * row] = val;
};

Matrix33.prototype.getColRowVal = function(col, row) {
  return this.m[col + 3 * row];
};

Matrix33.prototype.toTranslateXYOp = function(tx, ty) {
  this.toIdentity();
  this.setColRowVal(2, 0, tx);
  this.setColRowVal(2, 1, ty);
  return this;
};

Matrix33.prototype.toScaleXYOp = function(sx, sy) {
  this.toIdentity();
  this.setColRowVal(0, 0, sx);
  this.setColRowVal(1, 1, sy);
  return this;
};

/**
 * Right-handed rotation clockwise as you look from the origin to positive-Z.
 * @param {number} angle
 * @returns {Matrix33}
 */
Matrix33.prototype.toRotateOp = function(angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  this.toIdentity();
  this.setColRowVal(0, 0, cos);
  this.setColRowVal(1, 0, -sin);
  this.setColRowVal(0, 1, sin);
  this.setColRowVal(1, 1, cos);
  return this;
};
/**
 * Mutates this matrix by multiplying it by that one.
 * @param {Matrix33} that
 * @return {Matrix33} this, mutated
 */
Matrix33.prototype.multiply = function(that) {
  for (var y = 0; y < 3; y++) {
    for (var x = 0; x < 3; x++) {
      var val = 0;
      for (var i = 0; i < 3; i++) {
        val += this.m[i + 3*y] * that.m[x + 3*i];
      }
      Matrix33.tempArray[x + 3*y] = val;
    }
  }
  for (var a = 0; a < 9; a++) {
    this.m[a] = Matrix33.tempArray[a];
  }
  return this;
};

Matrix33.prototype.set = function(that) {
  for (var i = 0; i < 9; i++) {
    this.m[i] = that.m[i];
  }
  return this;
};

Matrix33.prototype.equals = function(that, opt_slop) {
  var slop = opt_slop || 0;
  for (var i = 0; i < 9; i++) {
    if (Math.abs(this.m[i] - that.m[i]) > slop) return false;
  }
  return true;
};

Matrix33.prototype.determinant = function() {
  var m = this.m;
  return m[0] * m[4] * m[8] +
       m[1] * m[5] * m[6] +
       m[2] * m[3] * m[7] -
       m[2] * m[4] * m[6] -
       m[1] * m[3] * m[8] -
       m[0] * m[5] * m[7];
};

Matrix33.prototype.toString = function() {
  return JSON.stringify(this.m);
};

Matrix33.prototype.toJSON = function() {
  return this.m.concat();
};

Matrix33.fromJSON = function(json) {
  return (new Matrix33()).set(json);
};
