/**
 * An 2d HallPainter, which paint tunnels bordered with walls,
 * but never erases a tunnel square.
 * @extends {Painter}
 * @constructor
 */
function HallPainter(centerX, centerY, hallRadius, wallThickness) {
  Painter.call(this);
  this.x = centerX;
  this.y = centerY;
  this.hallRadius = hallRadius;
  this.wallThickness = wallThickness;
  this.radius = hallRadius + wallThickness;
  this.hallRadiusSq = this.hallRadius * this.hallRadius;
  this.radiusSq = this.radius * this.radius;
}
HallPainter.prototype = new Painter();
HallPainter.prototype.constructor = HallPainter;

HallPainter.prototype.getEffect = function(x, y, r, maxed, oldColor) {
  if (oldColor == 1) {
    // Never paint over a hall
    return Painter.PAINT_NOTHING;
  }
  var cdx = Math.abs(this.x - x);
  var cdy = Math.abs(this.y - y);
  if (cdx > this.radius + r || cdy > this.radius + r) {
    return Painter.PAINT_NOTHING;
  }
  // test closest point or edge
  var ndx = cdx < r ? 0 : cdx - r;
  var ndy = cdy < r ? 0 : cdy - r;

  var nDistSq = Vec2d.distanceSq(0, 0, ndx, ndy);
  if (this.radiusSq < nDistSq) {
    // closest point on the square is outside the while paint radius
    return Painter.PAINT_NOTHING;
  }

  var fdx = cdx + r;
  var fdy = cdy + r;
  var fDistSq = Vec2d.distanceSq(0, 0, fdx, fdy);
  if (fDistSq < this.hallRadiusSq) {
    // Whole square falls within the hall-circle.
    return 1; // hall
  }

  if (!Array.isArray(oldColor) && this.hallRadiusSq < nDistSq && fDistSq < this.radiusSq) {
    // Whole square is in the wall ring.
    return 2; // wall
  }

  if (!maxed) return Painter.PAINT_DETAILS;

  // maxed
  return oldColor === 0 ? 2 : Painter.PAINT_NOTHING;
};

/**
 * @param {Rect=} opt_out
 * @return {Rect}
 */
HallPainter.prototype.getBoundingRect = function(opt_out) {
  var out = opt_out || new Rect();
  return out.setPosXY(this.x, this.y).pad(this.radius);
};
