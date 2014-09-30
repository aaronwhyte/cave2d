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

HitCalc.prototype.calcHitRectRect = function(now, a, b) {
  var aPos = a.getPosAtTime(now, Vec2d.alloc());
  var bPos = b.getPosAtTime(now, Vec2d.alloc());

  // For most of the computations, we shift times left so "now" is zero.
  var maxDuration = Math.min(a.getPathEndTime(), b.getPathEndTime()) - now;
  var t = maxDuration + 1; // effectively infinity

  var count = this.overlapTime1D(
      aPos.x, a.vel.x, a.rectRad.x,
      bPos.x, b.vel.x, b.rectRad.x,
      this.xOverlap);
  if (count == 0 || this.xOverlap[0] > maxDuration || this.xOverlap[1] <= 0) {
    // no overlap, or overlap out of time range
    return null;
  }
  count = this.overlapTime1D(
      aPos.y, a.vel.y, a.rectRad.y,
      bPos.y, b.vel.y, b.rectRad.y,
      this.yOverlap);
  if (count == 0 || this.yOverlap[0] > maxDuration || this.yOverlap[1] <= 0) {
    // no overlap, or overlap out of time range
    return null;
  }

  var overlapStart = Math.max(this.xOverlap[0], this.yOverlap[0]);
  var overlapEnd = Math.min(this.xOverlap[1], this.yOverlap[1]);
  if (overlapStart > overlapEnd) {
    return null;
  }
  aPos.free();
  bPos.free();
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_HIT;
  e.time = now + overlapStart;
  e.pathId0 = a.pathId;
  e.pathId1 = b.pathId;
//  e.axis = axis;
  return e;
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

  // quadratic equation
  var a = dx * dx + dy * dy; // not zero, because vels are not equal
  var b = 2 * (x * dx + y * dy);
  var c = x * x + y * y - dist * dist;
  var sqrtb2_4ac = Math.sqrt(b * b - 4 * a * c);

  var t = maxDuration + 1; // effectively infinity
  var solved = false;

  var sol = (-b + sqrtb2_4ac) / (2 * a);
  if (sol > 0 && sol <= maxDuration) {
    t = sol;
    solved = true;
  }
  sol = (-b - sqrtb2_4ac) / (2 * a);
  if (sol > 0 && sol <= maxDuration && sol < t) {
    t = sol;
    solved = true;
  }
  p0.free();
  p1.free();
  if (!solved) return null;
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_HIT;
  e.time = now + t;
  e.pathId0 = b0.pathId;
  e.pathId1 = b1.pathId;
  e.axis = null;
  return e;
};

HitCalc.prototype.calcHitRectCircle = function(now, r, c) {
  return null; // TODO
};
