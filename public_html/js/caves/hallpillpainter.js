/**
 * An 2d HallPillPainter, which paint tunnels bordered with walls,
 * but never erases a tunnel square.
 * @extends {Painter}
 * @constructor
 */
function HallPillPainter(segment, hallRadius, wallThickness) {
  Painter.call(this);
  this.segment = segment;
  this.hallRadius = hallRadius;
  this.wallThickness = wallThickness;
  this.radius = hallRadius + wallThickness;
//  this.hallRadiusSq = this.hallRadius * this.hallRadius;
//  this.radiusSq = this.radius * this.radius;
}
HallPillPainter.prototype = new Painter();
HallPillPainter.prototype.constructor = HallPillPainter;

HallPillPainter.prototype.getEffect = function(x, y, r, maxed, oldColor) {
  var squareCenter = new Vec2d(x, y);
  if (oldColor == 1) {
    // Never paint over a hall
    return Painter.PAINT_NOTHING;
  }
  r *= Math.SQRT2;
  var dist = Math.sqrt(this.segment.distanceToPointSquared(squareCenter));
  if (dist > this.radius + r) {
    // The square is totally outside the pill.
    return Painter.PAINT_NOTHING;
  }
  if (dist < this.hallRadius - r) {
    // The square is totally inside the inner pill.
    return 1;
  }
//  if (dist > this.hallRadius + r && dist < this.radius - r) {
//    return 2;
//  }
  return maxed ? 2 : Painter.PAINT_DETAILS;
};

/**
 * @param {Array=} opt_out
 * @returns {*|Array} [x, y, x-radius, y-sradius]
 */
HallPillPainter.prototype.getBoundingRect = function(opt_out) {
  var out = opt_out || [];
  out[0] = (this.segment.p1.x + this.segment.p2.x) / 2;
  out[1] = (this.segment.p1.y + this.segment.p2.y) / 2;
  out[2] = Math.abs(this.segment.p1.x - this.segment.p2.x) / 2 + this.radius;
  out[3] = Math.abs(this.segment.p1.y - this.segment.p2.y) / 2 + this.radius;
  return out;
};
