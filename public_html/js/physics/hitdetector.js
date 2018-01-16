/**
 * Creates WorldEvents for collisions between bodies.
 * @constructor
 */
function HitDetector() {
  this.xOverlap = [0, 0];
  this.yOverlap = [0, 0];
  this.overlap = [0, 0, null]; // start, end, axis if any
  this.p0 = new Vec2d();
  this.p1 = new Vec2d();
  this.p2 = new Vec2d();
  this.p3 = new Vec2d();
  this.p4 = new Vec2d();
  this.p5 = new Vec2d();
  this.p6 = new Vec2d();
  this.p7 = new Vec2d();
  this.p8 = new Vec2d();
  this.p9 = new Vec2d();
}

HitDetector.prototype.calcHit = function(now, b0, b1, eventOut) {
  if (b0.vel.equals(b1.vel)) {
    // If they're moving at the same speed then they can't collide.
    return null;
  }
  let hit = null;
  if (b0.shape === Body.Shape.RECT) {
    if (b1.shape === Body.Shape.RECT) {
      hit = this.calcHitRectRect(now, b0, b1, eventOut);
    } else {
      hit = this.calcHitRectCircle(now, b0, b1, eventOut);
    }
  } else if (b1.shape === Body.Shape.RECT) {
    hit = this.calcHitRectCircle(now, b1, b0, eventOut);
  } else {
    hit = this.calcHitCircleCircle(now, b0, b1, eventOut);
  }
  return hit;
};

/**
 * @param {number} now
 * @param {Body} b0 Rectangluar body
 * @param {Body} b1 Rectangluar body
 * @param {WorldEvent} eventOut Pre-allocated output param.
 * @returns {?WorldEvent} Event if hit, or null.
 */
HitDetector.prototype.calcHitCircleCircle = function(now, b0, b1, eventOut) {
  let p0 = b0.getPosAtTime(now, this.p0);
  let p1 = b1.getPosAtTime(now, this.p1);

  // For most of the computations, we shift times left so "now" is zero.
  let maxDuration = Math.min(b0.getPathEndTime(), b1.getPathEndTime()) - now;

  // Normalize as if b0 is holding still at 0, 0.
  let overlap = this.circleOriginOverlapTime(
      p1.x - p0.x,
      p1.y - p0.y,
      b1.vel.x - b0.vel.x,
      b1.vel.y - b0.vel.y,
      b0.rad + b1.rad);
  let e = null;
  if (overlap && 0 < overlap[0] && overlap[0] <= maxDuration) {
    e = eventOut;
    e.type = WorldEvent.TYPE_HIT;
    e.time = now + overlap[0];
    e.pathId0 = b0.pathId;
    e.pathId1 = b1.pathId;
    e.collisionVec.set(b1.getPosAtTime(e.time, p1)).subtract(b0.getPosAtTime(e.time, p0));
  }
  return e;
};

/**
 * @param {number} now
 * @param {Body} rect Rectangluar body
 * @param {Body} circ Circular body
 * @param {WorldEvent} eventOut Pre-allocated output param.
 * @returns {?WorldEvent} Event if hit, or null.
 */
HitDetector.prototype.calcHitRectCircle = function(now, rect, circ, eventOut) {
  let e = null;
  let posRect = rect.getPosAtTime(now, this.p0);
  let posCirc = circ.getPosAtTime(now, this.p1);
  let maxDuration = Math.min(rect.getPathEndTime(), circ.getPathEndTime()) - now;

  // bounding rect check
  let brectOverlap = this.rectOverlapTime(
      posRect, rect.vel, rect.rectRad.x, rect.rectRad.y,
      posCirc, circ.vel, circ.rad, circ.rad);
  // If the brects don't overlap, or *finish* before 0, or start after max, then there's no legal hit.
  if (!brectOverlap || brectOverlap[1] <= 0 || maxDuration < brectOverlap[0]) {
    return null;
  }

  // Put the circle at 0, 0, holding still. x, y, dx, and dy are for the rect.
  let pos = posRect.subtract(posCirc);
  let vel = posCirc.set(rect.vel).subtract(circ.vel);
  let vSign = this.p2.set(vel).sign();

  // Check leading edges. If a hit is found, return immediately,
  // because an edge hit is always earlier than a corner hit.
  // TODO more efficient special-purpose point vs aa-segment code.
  let edgePos = this.p3;
  let edgeRad = this.p4;
  let compassPos = this.p5;
  for (let i = 0; i < 2 && !e; i++) {
    let axis = Vec2d.AXES[i];
    if (vSign[axis]) {
      edgePos.set(pos);
      edgePos[axis] += rect.rectRad[axis] * vSign[axis];
      edgeRad.set(rect.rectRad);
      edgeRad[axis] = 0;

      compassPos[axis] = -vSign[axis] * circ.rad;
      let edgeOverlapTime = this.rectOverlapTime(
          edgePos, vel, edgeRad.x, edgeRad.y,
          compassPos, Vec2d.ZERO, 0, 0);
      compassPos[axis] = 0;
      if (edgeOverlapTime && 0 < edgeOverlapTime[0] && edgeOverlapTime[0] <= maxDuration) {
        e = eventOut;
        e.type = WorldEvent.TYPE_HIT;
        e.time = now + edgeOverlapTime[0];
        e.pathId0 = rect.pathId;
        e.pathId1 = circ.pathId;
        e.collisionVec.setXY(0, 0)[axis] = 1; // I guess?
      }
    }
  }
  if (e) {
    // There was an edge hit.
    return e;
  }

  // Now find the earliest hit time, even if it's outside the legal range, because it will be
  // the actual shape-to-shape hit time. Save the range check for last.

  // Check rect's leading corners, as point-circles, against the circle at 0, 0.
  // The bounding rects hit, so the rect is definitely approaching the circle.
  let t = maxDuration + 1;
  let cornerPos = this.p6;
  let hitCorner = this.p7;
  let overlap;
  if (vSign.x && vSign.y) {
    // Diagonal motion. Check leading corner and two trailing corners.
    // A trailing corner might hit before a lead corner, so check them all.
    // TODO: Don't check a trailing corner if it starts in 1D overlap with circle.

    // lead corner
    cornerPos.set(rect.rectRad).multiply(vSign).add(pos);
    overlap = this.circleOriginOverlapTime(
        cornerPos.x, cornerPos.y, vel.x, vel.y, circ.rad);
    if (overlap) {
      t = overlap[0];
      hitCorner.set(cornerPos);
    }
    // corner above/below lead
    overlap = this.circleOriginOverlapTime(
        cornerPos.x, pos.y - vSign.y * rect.rectRad.y,
        vel.x, vel.y, circ.rad);
    if (overlap && overlap[0] < t) {
      t = overlap[0];
      hitCorner.setXY(cornerPos.x, pos.y - vSign.y * rect.rectRad.y);
    }
    // corner right/left of lead
    overlap = this.circleOriginOverlapTime(
        pos.x - vSign.x * rect.rectRad.x, cornerPos.y,
        vel.x, vel.y, circ.rad);
    if (overlap && overlap[0] < t) {
      t = overlap[0];
      hitCorner.setXY(pos.x - vSign.x * rect.rectRad.x, cornerPos.y);
    }
  } else {
    // Axis-aligned motion.
    // Check the two leading corners.
    // CornerPos starts in the middle of the lead edge,
    // then we shift it to the corners.
    let shift = this.p8.set(vSign).rot90Right().multiply(rect.rectRad);
    let edgeCenter = this.p9.set(rect.rectRad).multiply(vSign).add(pos);
    for (let i = 0; i < 2; i++) {
      cornerPos.set(edgeCenter).add(shift);
      overlap = this.circleOriginOverlapTime(
          cornerPos.x, cornerPos.y, vel.x, vel.y, circ.rad);
      if (overlap && overlap[0] < t) {
        t = overlap[0];
        hitCorner.set(cornerPos);
      }
      shift.scale(-1);
    }
  }
  if (0 < t && t <= maxDuration) {
    e = eventOut;
    e.type = WorldEvent.TYPE_HIT;
    e.time = now + t;
    e.pathId0 = rect.pathId;
    e.pathId1 = circ.pathId;

    // Slide the hit corner to the edge of the circle.
    e.collisionVec.set(vel).scale(t).add(hitCorner);
  }
  return e;
};

/**
 * @param {number} now
 * @param {Body} b0 Rectangluar body
 * @param {Body} b1 Rectangluar body
 * @param {WorldEvent} eventOut Pre-allocated output param.
 * @returns {?WorldEvent} Event if hit, or null.
 */
HitDetector.prototype.calcHitRectRect = function(now, b0, b1, eventOut) {
  let pos0 = b0.getPosAtTime(now, this.p0);
  let pos1 = b1.getPosAtTime(now, this.p1);

  // For most of the computations, we shift times left so "now" is zero.
  let maxDuration = Math.min(b0.getPathEndTime(), b1.getPathEndTime()) - now;
  let overlap = this.rectOverlapTime(
      pos0, b0.vel, b0.rectRad.x, b0.rectRad.y,
      pos1, b1.vel, b1.rectRad.x, b1.rectRad.y);

  let e = null;
  if (overlap && 0 < overlap[0] && overlap[0] <= maxDuration) {
    e = eventOut;
    e.type = WorldEvent.TYPE_HIT;
    e.time = now + overlap[0];
    e.pathId0 = b0.pathId;
    e.pathId1 = b1.pathId;
    e.collisionVec.setXY(0, 0)[overlap[2]] = 1;
  }
  return e;
};


/**
 * @param {number} x
 * @param {number} y
 * @param {number} dx
 * @param {number} dy
 * @param {number} rad
 * @returns {?Array} null for no overlap, or a two element array [start time, end time]
 */
HitDetector.prototype.circleOriginOverlapTime = function(x, y, dx, dy, rad) {
  // quadratic equation
  let a = dx * dx + dy * dy; // not zero, because vels are not equal
  if (a === 0) return null;
  let b = 2 * (x * dx + y * dy);
  let c = x * x + y * y - rad * rad;
  let b2_4ac = b * b - 4 * a * c;
  if (b2_4ac < 0) return null;
  let sqrtb2_4ac = Math.sqrt(b2_4ac);

  let t = (-b + sqrtb2_4ac) / (2 * a);
  let t2 = (-b - sqrtb2_4ac) / (2 * a);
  this.overlap[0] = Math.min(t, t2);
  this.overlap[1] = Math.max(t, t2);
  return this.overlap;
};


/**
 * @param {Vec2d} pos0
 * @param {Vec2d} vel0
 * @param {number} rad0x
 * @param {number} rad0y
 * @param {Vec2d} pos1
 * @param {Vec2d} vel1
 * @param {number} rad1x
 * @param {number} rad1y
 * @returns {?Array} null for no overlap, or a two element array [start time, end time]
 */
HitDetector.prototype.rectOverlapTime = function(
    pos0, vel0, rad0x, rad0y,
    pos1, vel1, rad1x, rad1y) {
  let count;
  count = this.overlapTime1D(
      pos0.x, vel0.x, rad0x,
      pos1.x, vel1.x, rad1x,
      this.xOverlap);
  if (count === 0) return null;
  count = this.overlapTime1D(
      pos0.y, vel0.y, rad0y,
      pos1.y, vel1.y, rad1y,
      this.yOverlap);
  if (count === 0) return null;

  let overlapStart; // max of overlap starts
  if (this.xOverlap[0] < this.yOverlap[0]) {
    overlapStart = this.yOverlap[0];
    this.overlap[2] = Vec2d.Y;
  } else {
    overlapStart = this.xOverlap[0];
    this.overlap[2] = Vec2d.X;
  }
  let overlapEnd = Math.min(this.xOverlap[1], this.yOverlap[1]);
  if (overlapEnd < overlapStart) return null;
  this.overlap[0] = overlapStart;
  this.overlap[1] = overlapEnd;
  return this.overlap;
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
HitDetector.prototype.overlapTime1D = function(p0, v0, r0, p1, v1, r1, out) {
  let v = v1 - v0;
  let p = p1 - p0;
  let r = r0 + r1;
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
    let tmp = out[0];
    out[0] = out[1];
    out[1] = tmp;
  }
  return 2;
};
