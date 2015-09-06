/**
 * A 2d CirclePainter, that can be overlapped with squares.
 * @extends {Painter}
 * @constructor
 */
function CirclePainter(centerX, centerY, radius, color) {
  Painter.call(this);
  this.x = centerX;
  this.y = centerY;
  this.radius = radius;
  this.color = color;
  this.radiusSq = this.radius * this.radius;
}
CirclePainter.prototype = new Painter();
CirclePainter.prototype.constructor = CirclePainter;

CirclePainter.prototype.getEffect = function(x, y, r, maxed, oldColor) {
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
  if (fDistSq < this.radiusSq) {
    // Whole square falls within the circle.
    return this.color;
  }
  return maxed ? Painter.PAINT_NOTHING : Painter.PAINT_DETAILS;
};

/**
 * @param {Rect=} opt_out
 * @return {Rect}
 */
CirclePainter.prototype.getBoundingRect = function(opt_out) {
  var out = opt_out || new Rect();
  return out.setPosXY(this.x, this.y).pad(this.radius);
};
