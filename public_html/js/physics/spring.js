/**
 * @constructor
 */
function Spring() {}

/**
 * Applies a dampened spring force between two bodies, where the spring is anchored at pos0 and pos1.
 * @param {Body} b0
 * @param {Vec2d} pos0
 * @param {Body} b1
 * @param {Vec2d} pos1
 * @param {number} restLength
 * @param {number} pullFactor
 * @param {number} dampFraction
 * @param {number} maxForce
 * @param {number} maxDist
 * @param {number} now
 * @returns {number} the magnitude of the force applied, or -1 if the length was longer than the maxDist.
 */
Spring.applyDampenedSpring = function(
    b0, pos0,
    b1, pos1,
    restLength, pullFactor, dampFraction, maxForce, maxDist,
    now) {
  let forceMag = -1;
  let p0p1 = Vec2d.alloc().set(pos1).subtract(pos0);
  let beamLength = p0p1.magnitude();
  if (beamLength < maxDist) {
    let totalForceVec = Vec2d.alloc();
    let minMass = Math.min(b0.mass, b1.mass);

    // pull
    let pullDistFactor = restLength ? (beamLength - restLength) / restLength : beamLength;
    let pullForceVec = p0p1.scaleToLength(-pullFactor * minMass * pullDistFactor);
    totalForceVec.add(pullForceVec);

    // damping
    if (dampFraction && minMass && minMass !== Infinity) {
      let vap0 = b0.getVelocityAtWorldPoint(now, pos0, Vec2d.alloc());
      let vap1 = b1.getVelocityAtWorldPoint(now, pos1, Vec2d.alloc());
      let velDiffAlongForceVec = vap1.subtract(vap0).projectOnto(pullForceVec);
      let dampAccel = velDiffAlongForceVec.scale(-dampFraction);
      let dampForceVec = dampAccel.scale(minMass);
      totalForceVec.add(dampForceVec);
      vap0.free();
      vap1.free();
    }

    // apply forces
    let x = beamLength / maxDist;
    if (x > 0) {
      totalForceVec.clipToMaxLength(maxForce * (1 - x * x));
      b1.applyForceAtWorldPosAndTime(totalForceVec, pos1, now);
      b0.applyForceAtWorldPosAndTime(totalForceVec.scale(-1), pos0, now);
      forceMag = totalForceVec.magnitude();
    } else {
      forceMag = 0
    }
    totalForceVec.free();
  }
  p0p1.free();
  return forceMag;
};

/**
 * Return the 1d pulse acceleration to apply to get one step closer to having a position and velocity of zero.
 * @param {number} p0  initial position
 * @param {number} v0  initial velocity
 * @param {number} maxA  maximum pulse acceleration (not acceleration / time)
 * @param {number} pulsePeriod  period between acceleration pulses, if any. Used to prevent overshooting.
 * @returns {number} the acceleration, between -maxA and maxA, to apply at this moment.
 */
Spring.getLandingAccel = function(p0, v0, maxA, pulsePeriod) {
  if (maxA <= 0) return 0;
  // Normalize so p0 is always positive.
  let flipped = p0 < 0;
  if (flipped) {
    p0 *= -1;
    v0 *= -1;
  }
  let a;
  if (p0 === 0) {
    if (Math.abs(v0) <= maxA) {
      // cancel vel in one step
      a = -v0;
    } else {
      // hit the brakes
      a = -Math.sign(v0) * maxA;
    }
  } else {
    if (v0 >= 0) {
      // We're heading away from the intercept, so
      // accelerate towards the intercept point.
      a = -maxA;
    } else {
      // v0 < 0 which means we're heading towards intercept already.
      // When will velocity equal zero if we decelerate hard?
      let t = -v0 / maxA;
      // At what pos will vel hit 0?
      let p = 0.5 * maxA * t * t  + v0 * t + p0;
      if (p < 0) {
        // We'll pass the intercept point, so go ahead and decelerate hard.
        a = maxA;
      } else {
        // v=0 before hitting intercept, so
        // accelerate towards the intercept point.
        a = -maxA;
      }
    }
    // Make sure we don't overshoot due to linear movement between pulses.
    if (a < 0 && p0 + pulsePeriod * (v0 + a) < 0) {
      let v1 = -p0 / pulsePeriod;
      a = Math.max(-maxA, Math.min(maxA, v1 - v0));
    }
  }
  return flipped ? -a : a;
};
