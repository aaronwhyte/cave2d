/**
 * Creates WorldEvents for collisions between bodies.
 * @constructor
 */
function HitCalc() {
  this.xOverlap = [0, 0];
  this.yOverlap = [0, 0];
}

HitCalc.prototype.calcHit = function(now, b0, b1) {
  if (b0.vel.equals(b1.vel)) {
    return null;
  }
  var hit = null;
  if (b0.shape == Body.Shape.RECT) {
    if (b1.shape == Body.Shape.RECT) {
      hit = this.calcHitRectRect(now, b0, b1);
    } else {
      hit = this.calcHitRectCircle(now, b0, b1);
    }
  } else if (b1.shape == Body.Shape.RECT) {
    hit = this.calcHitRectCircle(now, b1, b0);
  } else {
    hit = this.calcHitCircleCircle(now, b0, b1);
  }
  return hit;
};

/**
 * @param {number} now
 * @param {Body} b0 Rectangluar body
 * @param {Body} b1 Rectangluar body
 * @returns {?WorldEvent} Event if hit, or null.
 */
HitCalc.prototype.calcHitCircleCircle = function(now, b0, b1) {
  var p0 = b0.getPosAtTime(now, Vec2d.alloc());
  var p1 = b1.getPosAtTime(now, Vec2d.alloc());

  // For most of the computations, we shift times left so "now" is zero.
  var maxDuration = Math.min(b0.getPathEndTime(), b1.getPathEndTime()) - now;

  // Normalize as if b0 is holding still at 0, 0.
  var x = p1.x - p0.x;
  var y = p1.y - p0.y;
  var dx = b1.vel.x - b0.vel.x;
  var dy = b1.vel.y - b0.vel.y;
  var dist = b0.rad + b1.rad;
  p0.free();
  p1.free();

  // quadratic equation
  var a = dx * dx + dy * dy; // not zero, because vels are not equal
  if (a == 0) return null;
  var b = 2 * (x * dx + y * dy);
  var c = x * x + y * y - dist * dist;
  var b2_4ac = b * b - 4 * a * c;
  if (b2_4ac < 0) return null;
  var sqrtb2_4ac = Math.sqrt(b2_4ac);

  var t = (-b + sqrtb2_4ac) / (2 * a);
  var t2 = (-b - sqrtb2_4ac) / (2 * a);
  if (t2 < t) {
    t = t2;
  }
  if (t <= 0 || maxDuration < t) return null;
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_HIT;
  e.time = now + t;
  e.pathId0 = b0.pathId;
  e.pathId1 = b1.pathId;
  e.axis = null;
  return e;
};

HitCalc.prototype.calcHitRectCircle = function(now, rect, circ) {
  // bounding rect check

  // if dv is straight on axis
  //
  // else diagonal
  //   corner vs circle
  //   compassX vs rect
  //   compassY vs rect
};

/**
 * @param {number} now
 * @param {Body} b0 Rectangluar body
 * @param {Body} b1 Rectangluar body
 * @returns {?WorldEvent} Event if hit, or null.
 */
HitCalc.prototype.calcHitRectRect = function(now, b0, b1) {
  var pos0 = b0.getPosAtTime(now, Vec2d.alloc());
  var pos1 = b1.getPosAtTime(now, Vec2d.alloc());

  // For most of the computations, we shift times left so "now" is zero.
  var maxDuration = Math.min(b0.getPathEndTime(), b1.getPathEndTime()) - now;
  var hitTime = this.timeUntilRectsHit(
      pos0, b0.vel, b0.rectRad,
      pos1, b1.vel, b1.rectRad,
      maxDuration);

  pos0.free();
  pos1.free();
  if (hitTime == 0) return null;
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_HIT;
  e.time = now + hitTime;
  e.pathId0 = b0.pathId;
  e.pathId1 = b1.pathId;
//  e.axis = axis;
  return e;
};

/**
 * @param {Vec2d} pos0
 * @param {Vec2d} vel0
 * @param {Vec2d} rad0
 * @param {Vec2d} pos1
 * @param {Vec2d} vel1
 * @param {Vec2d} rad1
 * @param {number} maxTime
 * @returns {number} time of hit, > 0 and <= maxTime, or 0 for no hit.
 */
HitCalc.prototype.timeUntilRectsHit = function(pos0, vel0, rad0, pos1, vel1, rad1, maxTime) {
  var count = this.overlapTime1D(
      pos0.x, vel0.x, rad0.x,
      pos1.x, vel1.x, rad1.x,
      this.xOverlap);
  if (count == 0 || this.xOverlap[1] <= 0 || maxTime < this.xOverlap[0]) {
    return 0;
  }
  count = this.overlapTime1D(
      pos0.y, vel0.y, rad0.y,
      pos1.y, vel1.y, rad1.y,
      this.yOverlap);
  if (count == 0 || this.yOverlap[1] <= 0 || maxTime < this.yOverlap[0]) {
    return 0;
  }
  var overlapStart = Math.max(this.xOverlap[0], this.yOverlap[0]);
  var overlapEnd = Math.min(this.xOverlap[1], this.yOverlap[1]);
  if (overlapStart > overlapEnd) {
    return 0;
  }
  return overlapStart;
};

/**
 * One-dimensional overlap timespan.
 * @param p0 position
 * @param v0 velocity
 * @param r0 radius
 * @param p1 position
 * @param v1 velocity
 * @param r1 radius
 * @param out output array. Zero, one, or two time values may be returned.
 * @returns {number} number of collisions returned on the output array
 */
HitCalc.prototype.overlapTime1D = function(p0, v0, r0, p1, v1, r1, out) {
  var v = v1 - v0;
  var p = p1 - p0;
  var r = r0 + r1;
  if (!v) {
    // forever, or never?
    if (Math.abs(p) < r) {
      // forever
      out[0] = -Infinity;
      out[1] = Infinity;
      return 2;
    } else {
      // never
      return 0;
    }
  }
  out[0] = (-p - r) / v;
  out[1] = (-p + r) / v;
  if (out[0] > out[1]) {
    var tmp = out[0];
    out[0] = out[1];
    out[1] = tmp;
  }
  return 2;
};
