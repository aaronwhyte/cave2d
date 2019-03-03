/**
 * This only has static methods, but the constructor gives it a namespace. Meh.
 * @constructor
 */
function OverlapDetector() {
}

OverlapDetector.isBodyOverlappingBodyAtTime = function(b0, b1, t) {
  let overlap;
  let p0 = b0.getPosAtTime(t, Vec2d.alloc());
  let p1 = b1.getPosAtTime(t, Vec2d.alloc());
  if (b0.shape === Body.Shape.CIRCLE && b1.shape === Body.Shape.CIRCLE) {
    overlap = OverlapDetector.isCircleOverlappingCircle(p0, b0.rad, p1, b1.rad);
  } else if (b0.shape === Body.Shape.RECT && b1.shape === Body.Shape.RECT) {
    overlap = OverlapDetector.isRectOverlappingRect(p0, b0.rectRad, p1, b1.rectRad);
  } else if (b0.shape === Body.Shape.RECT) {
    overlap = OverlapDetector.isRectOverlappingCircle(p0, b0.rectRad, p1, b1.rad);
  } else {
    overlap = OverlapDetector.isRectOverlappingCircle(p1, b1.rectRad, p0, b0.rad);
  }
  p0.free();
  p1.free();
  return overlap;
};

OverlapDetector.isCircleOverlappingCircle = function(v0, r0, v1, r1) {
  let r = r0 + r1;
  return v0.distanceSquared(v1) <= r * r;
};

OverlapDetector.isRectOverlappingRect = function(p0, rectRad0, p1, rectRad1) {
  let rx = rectRad0.x + rectRad1.x;
  let ry = rectRad0.y + rectRad1.y;
  let dx = Math.abs(p0.x - p1.x);
  let dy = Math.abs(p0.y - p1.y);
  return dx <= rx && dy <= ry;
};

OverlapDetector.isRectOverlappingCircle = function(rectPos, rectRad, circPos, radius) {
  let nearCorner = Vec2d.alloc(rectPos.x, rectPos.y).subtract(circPos).abs().subtract(rectRad);
  let overlap =
      // rect covers origin?
      (nearCorner.x <= 0 && nearCorner.y <= 0) ||
      // rect overlaps vertical axis of circle?
      (nearCorner.x <= 0 && nearCorner.y <= radius) ||
      // rect overlaps horizontal axis of circle?
      (nearCorner.y <= 0 && nearCorner.x <= radius) ||
      // rect corner inside circle?
      nearCorner.magnitudeSquared() <= radius * radius;
  nearCorner.free();
  return overlap;
};
