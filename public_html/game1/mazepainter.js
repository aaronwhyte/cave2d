/**
 * An 2d QuadTree Painter, which paint tunnels bordered with thin solid walls
 * and thicker fake walls. It never erases a floor square.
 * @extends {Painter}
 * @constructor
 */
function MazePainter(segment, floorRadius, wallThickness) {
  Painter.call(this);
  this.segment = segment;
  this.floorRadius = floorRadius;
  this.wallThickness = wallThickness;
  this.radius = floorRadius + wallThickness;
}
MazePainter.prototype = new Painter();
MazePainter.prototype.constructor = MazePainter;

MazePainter.VOID = 0;
MazePainter.FLOOR = 1;
MazePainter.SOLID = 2;
MazePainter.FAKE = 3;

var retz = 0;
MazePainter.prototype.getEffect = function(x, y, boxRad, maxed, oldColor) {
  if (oldColor == MazePainter.FLOOR) {
    // Never paint over a floor
    retz++;
    return Painter.PAINT_NOTHING;
  }
  var cornerRad = boxRad * Math.SQRT2; // radius of the diagonal of the box
  var dist = Math.sqrt(this.segment.distanceToPointSquaredXY(x, y));
  if (dist - cornerRad > this.radius) {
    // The square is totally outside the pill.
    return Painter.PAINT_NOTHING;
  }
  if (dist + cornerRad < this.floorRadius) {
    // The square is totally inside the inner pill.
    return MazePainter.FLOOR;
  }

  if (oldColor == MazePainter.VOID && dist - cornerRad > this.floorRadius && dist + cornerRad < this.radius) {
    // The square is totally in the "fake" shell.
    return MazePainter.FAKE;
  }

  if (maxed) {
    if (oldColor != MazePainter.SOLID) {
      return dist - cornerRad > this.floorRadius ? MazePainter.FAKE : MazePainter.SOLID;
    } else {
      return Painter.PAINT_NOTHING;
    }
  } else {
    return Painter.PAINT_DETAILS;
  }
};

/**
 * @param {Rect=} opt_out
 * @return {Rect}
 */
MazePainter.prototype.getBoundingRect = function(opt_out) {
  var out = opt_out || new Rect();
  return out.setToCorners(this.segment.p1, this.segment.p2).pad(this.radius);
};
