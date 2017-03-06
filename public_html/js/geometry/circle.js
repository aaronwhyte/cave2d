/**
 * @param opt_x
 * @param opt_y
 * @param opt_rad
 * @constructor
 */
function Circle(opt_x, opt_y, opt_rad) {
  this.pos = new Vec2d(opt_x, opt_y);
  this.rad = opt_rad || 0;
}

/**
 * @param {Rect} out
 */
Circle.prototype.getBoundingRect = function(out) {
  return out.setPos(this.pos).setRadXY(this.rad, this.rad);
};

//
//
// /**
//  * Distance from the edge of the circle to a point. Point on the edge have distance 0. Points on the interior have
//  * negative distance.
//  * @param x
//  * @param y
//  * @returns {number}
//  */
// Circle.prototype.distanceToEdgeXY = function(x, y) {
//   return Vec2d.distance(x, y, this.x, this.y) - this.r;
// };
//
// /**
//  * @param x
//  * @param y
//  * @returns {boolean}
//  */
// Circle.prototype.overlapsXY = function(x, y) {
//   return Vec2d.distanceSq(x, y, this.x, this.y) <= this.r * this.r;
// };
//
// /**
//  * @param {Circle} that
//  * @returns {boolean}
//  */
// Circle.prototype.overlapsCircle = function(that) {
//   return Vec2d.distanceSq(this.x, this.y, that.x, that.y) <= (this.r + that.r) * (this.r + that.r);
// };
//
