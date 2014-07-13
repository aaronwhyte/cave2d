/**
 * An 2d CircleArea, that can be overlapped with squares.
 * @extends {Area}
 * @constructor
 */
function CircleArea(centerX, centerY, radius) {
  Area.call(this);
  this.x = centerX;
  this.y = centerY;
  this.r = radius;
}
CircleArea.prototype = new Area();
CircleArea.prototype.constructor = CircleArea;

CircleArea.prototype.squareOverlap = function(x, y, r) {
  var cdx = Math.abs(this.x - x);
  var cdy = Math.abs(this.y - y);
  if (cdx > this.r + r || cdy > this.r + r) {
    return Area.OVERLAP_NONE;
  }
  var r2 = this.r * this.r;
  // test closest point or edge
  var ndx = cdx < r ? 0 : cdx - r;
  var ndy = cdy < r ? 0 : cdy - r;
  if (Vec2d.distanceSq(0, 0, ndx, ndy) > r2) {
    return Area.OVERLAP_NONE;
  }
  // overlap is partial or full. which?
  var fdx = cdx + r;
  var fdy = cdy + r;
  if (Vec2d.distanceSq(0, 0, fdx, fdy) < r2) {
    return Area.OVERLAP_FULL;
  }
  return Area.OVERLAP_PARTIAL;
};