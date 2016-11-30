/**
 * An axis-aligned hyperrectangle defined as a center point and three axis-aligned radii.
 * By default, the position os [0, 0, 0] and the radii are [1, 1, 1].
 * @param {=Vec4} opt_pos
 * @param {=Vec4} opt_rad
 * @constructor
 */
function Cuboid(opt_pos, opt_rad) {
  this.pos = new Vec4();
  this.rad = new Vec4();
  this.reset(opt_pos, opt_rad);
}

/**
 * @param {=Vec4} opt_pos
 * @param {=Vec4} opt_rad
 */
Cuboid.prototype.reset = function(opt_pos, opt_rad) {
  if (opt_pos) {
    this.pos.set(opt_pos);
  } else {
    this.pos.setXYZ(0, 0, 0);
  }
  if (opt_rad) {
    this.rad.set(opt_rad);
  } else {
    this.rad.setXYZ(1, 1, 1);
  }
  return this;
};

Cuboid.pool = [];

/**
 * @param {=Vec4} opt_pos
 * @param {=Vec4} opt_rad
 */
Cuboid.alloc = function(opt_pos, opt_rad) {
  if (Cuboid.pool.length) {
    return Cuboid.pool.pop().reset(opt_pos, opt_rad);
  }
  return new Cuboid(opt_pos, opt_rad);
};

Cuboid.prototype.free = function() {
  Cuboid.pool.push(this);
};

Cuboid.free = function(obj) {
  obj.free();
};

/**
 * @param {Cuboid} that
 * @returns {Cuboid} this
 */
Cuboid.prototype.set = function(that) {
  this.pos.set(that.pos);
  this.rad.set(that.rad);
  return this;
};

/**
 * @param {Vec4} a
 * @param {Vec4} b
 * @returns {Cuboid}
 */
Cuboid.prototype.setToCorners = function(a, b) {
  this.pos.set(a).add(b).scale(0.5);
  this.rad.set(a).subtract(b).scale1(0.5).abs();
  return this;
};

/**
 * @param canvas
 * @returns {Cuboid}
 */
Cuboid.prototype.setToCanvas = function(canvas) {
  var w = canvas.width;
  var h = canvas.height;
  this.pos.setXYZ(w/2, h/2, 0);
  this.rad.setXYZ(w/2, h/2, 1);
  return this;
};

/**
 * @param {Vec4} v
 * @returns {Cuboid}
 */
Cuboid.prototype.setPos = function(v) {
  this.pos.set(v);
  return this;
};

/**
 * @param {Vec4} v
 * @returns {Cuboid}
 */
Cuboid.prototype.setRad = function(v) {
  this.rad.set(v);
  return this;
};

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Cuboid}
 */
Cuboid.prototype.setPosXYZ = function(x, y, z) {
  this.pos.setXYZ(x, y, z);
  return this;
};

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Cuboid}
 */
Cuboid.prototype.setRadXYZ = function(x, y, z) {
  this.rad.setXYZ(x, y, z);
  return this;
};

/**
 * @param {Vec4} out
 * @returns {Vec4} out set to the low x, y, and z vals
 */
Cuboid.prototype.getMinCorner = function(out) {
  return out.set(this.rad).scale1(-1).add(this.pos);
};

/**
 * @returns {Vec4} out set to the high x, y, and z vals
 */
Cuboid.prototype.getMaxCorner = function(out) {
  return out.set(this.rad).add(this.pos);
};

/**
 * @param x
 * @param y
 * @return {boolean}
 */
Cuboid.prototype.overlapsXY = function(x, y) {
  return Math.abs(this.pos.getX() - x) <= this.rad.getX() && Math.abs(this.pos.getY() - y);
};

Cuboid.prototype.equals = function(that, opt_slop) {
  if (!that) return false;
  return this.pos.equals(that.pos, opt_slop) && this.rad.equals(that.rad, opt_slop);
};

Cuboid.prototype.toString = function() {
  return '(pos:' + this.pos + ', rad:' + this.rad + ')';
};

// TODO pad, move, cover, overlaps
