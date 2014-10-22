/**
 * An axis-aligned rectangle with a center and an x and y radius (half height and half width)
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_rx
 * @param {=number} opt_ry
 * @constructor
 */
function Rect(opt_x, opt_y, opt_rx, opt_ry) {
  this.pos = new Vec2d();
  this.rad = new Vec2d();
  this.reset(opt_x, opt_y, opt_rx, opt_ry);
}

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_rx
 * @param {=number} opt_ry
 */
Rect.prototype.reset = function(opt_x, opt_y, opt_rx, opt_ry) {
  this.pos.setXY(opt_x || 0 , opt_y || 0);
  this.rad.setXY(opt_rx || 0, opt_ry || 0);
  return this;
};

Rect.pool = [];

/**
 * @param {=number} opt_x
 * @param {=number} opt_y
 * @param {=number} opt_rx
 * @param {=number} opt_ry
 */
Rect.alloc = function(opt_x, opt_y, opt_rx, opt_ry) {
  if (Rect.pool.length) {
    return Rect.pool.pop().reset(opt_x, opt_y, opt_rx, opt_ry);
  }
  return new Rect(opt_x, opt_y, opt_rx, opt_ry);
};

Rect.prototype.free = function() {
  Rect.pool.push(this);
};

Rect.free = function(obj) {
  obj.free();
};

Rect.prototype.set = function(r) {
  this.pos.set(r.pos);
  this.rad.set(r.rad);
  return this;
};

Rect.prototype.setToCorners = function(a, b) {
  this.pos.set(a).add(b).scale(0.5);
  this.rad.set(a).subtract(b).scale(0.5).abs();
  return this;
};

Rect.prototype.setPos = function(v) {
  this.pos.set(v);
  return this;
};

Rect.prototype.setRad = function(v) {
  this.rad.set(v);
  return this;
};

Rect.prototype.setPosXY = function(x, y) {
  this.pos.setXY(x, y);
  return this;
};

Rect.prototype.setRadXY = function(x, y) {
  this.rad.setXY(x, y);
  return this;
};

Rect.prototype.padXY = function(x, y) {
  this.rad.x += x;
  this.rad.y += y;
  return this;
};

Rect.prototype.pad = function(p) {
  this.rad.x += p;
  this.rad.y += p;
  return this;
};

Rect.prototype.coverRect = function(that) {
  var minX = Math.min(this.getMinX(), that.getMinX());
  var minY = Math.min(this.getMinY(), that.getMinY());
  var maxX = Math.max(this.getMaxX(), that.getMaxX());
  var maxY = Math.max(this.getMaxY(), that.getMaxY());
  this.pos.setXY((minX + maxX) / 2, (minY + maxY) / 2);
  this.rad.setXY(Math.abs(minX - maxX) / 2, Math.abs(minY - maxY) / 2);
  return this;
};

Rect.prototype.coverVec = function(v) {
  var minX = Math.min(this.getMinX(), v.x);
  var minY = Math.min(this.getMinY(), v.y);
  var maxX = Math.max(this.getMaxX(), v.x);
  var maxY = Math.max(this.getMaxY(), v.y);
  this.pos.setXY((minX + maxX) / 2, (minY + maxY) / 2);
  this.rad.setXY(Math.abs(minX - maxX) / 2, Math.abs(minY - maxY) / 2);
  return this;
};

Rect.prototype.getMinX = function() {
  return this.pos.x - this.rad.x;
};

Rect.prototype.getMinY = function() {
  return this.pos.y - this.rad.y;
};

Rect.prototype.getMaxX = function() {
  return this.pos.x + this.rad.x;
};

Rect.prototype.getMaxY = function() {
  return this.pos.y + this.rad.y;
};

Rect.prototype.getWidth = function() {
  return this.rad.x * 2;
};

Rect.prototype.getHeight = function() {
  return this.rad.y * 2;
};

Rect.prototype.overlapsRectXYXY = function(x, y, rx, ry) {
  return Math.abs(this.pos.x - x) <= this.rad.x + rx &&
         Math.abs(this.pos.y - y) <= this.rad.y + ry;
};