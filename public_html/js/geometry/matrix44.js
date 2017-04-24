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

Matrix44.tempArray = [
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0];

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

Matrix44.prototype.toTranslateOp = function(vec4) {
  this.toIdentity();
  for (var row = 0; row < 3; row++) {
    this.m[3 + 4 * row] = vec4.v[row];
  }
  return this;
};

Matrix44.prototype.toTranslateOpXYZ = function(x, y, z) {
  this.toIdentity();
  this.m[3] = x;
  this.m[7] = y;
  this.m[11] = z;
  return this;
};

Matrix44.prototype.toScaleOp = function(vec4) {
  this.toIdentity();
  for (var xy = 0; xy < 3; xy++) {
    this.m[5 * xy] = vec4.v[xy];
  }
  return this;
};

Matrix44.prototype.toScaleOpXYZ = function(x, y, z) {
  this.toIdentity();
  this.m[0] = x;
  this.m[5] = y;
  this.m[10] = z;
  return this;
};

Matrix44.prototype.toTranslateXYZAndScaleXYZOp = function(tx, ty, tz, sx, sy, sz) {
  this.toIdentity();
  this.m[3] = tx;
  this.m[7] = ty;
  this.m[11] = tz;
  this.m[0] = sz;
  this.m[5] = sy;
  this.m[10] = sz;
  return this;
};


Matrix44.prototype.toSheerZOpXY = function(x, y) {
  this.toIdentity();
  this.m[2] = x;
  this.m[6] = y;
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
  this.setColRowVal(2, 1, -sin);
  this.setColRowVal(1, 2, sin);
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
  this.setColRowVal(2, 0, sin);
  this.setColRowVal(0, 2, -sin);
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
  this.setColRowVal(1, 0, -sin);
  this.setColRowVal(0, 1, sin);
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
      Matrix44.tempArray[x + 4*y] = val;
    }
  }
  for (var a = 0; a < 16; a++) {
    this.m[a] = Matrix44.tempArray[a];
  }
  return this;
};

Matrix44.prototype.set = function(that) {
  for (var i = 0; i < 16; i++) {
    this.m[i] = that.m[i];
  }
  return this;
};

Matrix44.prototype.setToPose = function(pose) {
  var temp = Matrix44.alloc();
  var retval = this.toTranslateOp(pose.pos)
      .multiply(temp.toRotateZOp(pose.rotZ))
      .multiply(temp.toScaleOp(pose.scale));
  temp.free();
  return retval;
};

Matrix44.prototype.equals = function(that, opt_slop) {
  var slop = opt_slop || 0;
  for (var i = 0; i < 16; i++) {
    if (Math.abs(this.m[i] - that.m[i]) > slop) return false;
  }
  return true;
};

Matrix44.prototype.getInverse = function(out) {
  out = out || new Matrix44();
  // Calculate the matrix of cofactors, the adugate matrix.
  // Divide by the determinant as we go.
  var oneOverDet = 1/this.determinant();
  var cofactor = Matrix33.alloc();
  for (var y = 0; y < 4; y++) {
    for (var x = 0; x < 4; x++) {
      // Transpose as we go, by swapping x and y coords.
      out.setColRowVal(y, x,
          oneOverDet *
          ((x % 2) ? -1 : 1) *
          ((y % 2) ? -1 : 1) *
          this.getCofactor(x, y, cofactor).determinant());
    }
  }
  cofactor.free();
  return out;
};

Matrix44.prototype.transpose = function() {
  for (var y = 0; y < 3; y++) {
    for (var x = y + 1; x < 4; x++) {
      var temp = this.getColRowVal(x, y);
      this.setColRowVal(x, y, this.getColRowVal(y, x));
      this.setColRowVal(y, x, temp);
    }
  }
  return this;
};

Matrix44.prototype.determinant = function() {
  var total = 0;
  var row = 0;
  var cofactor = Matrix33.alloc();
  for (var col = 0; col < 4; col++) {
    this.getCofactor(col, row, cofactor);
    total +=
        ((col % 2) ? -1 : 1) *
        this.getColRowVal(col, row) *
        cofactor.determinant();
  }
  cofactor.free();
  return total;
};

Matrix44.prototype.getCofactor = function(col, row, mat33) {
  mat33 = mat33 || new Matrix33();
  for (var y = 0; y < 3; y++) {
    for (var x = 0; x < 3; x++) {
      mat33.setColRowVal(x, y, this.getColRowVal(x + (x < col ? 0 : 1), y + (y < row ? 0 : 1)));
    }
  }
  return mat33;
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
