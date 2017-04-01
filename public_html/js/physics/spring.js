/**
 * @constructor
 */
function Spring() {}

/**
 *
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
  var forceMag = -1;
  var p0p1 = Vec2d.alloc().set(pos1).subtract(pos0);
  var beamLength = p0p1.magnitude();
  if (beamLength < maxDist) {
    var totalForceVec = Vec2d.alloc();
    var minMass = Math.min(b0.mass, b1.mass);
    var x;

    // pull
    var pullDistFactor = (beamLength - restLength) / restLength;
    var pullForceVec = p0p1.scaleToLength(-pullFactor * minMass * pullDistFactor);
    totalForceVec.add(pullForceVec);

    // damping
    pullForceVec.scaleToLength(1);
    // var reciprocalMass = Math.max(targetReciprocalMass, playerReciprocalMass);
    if (minMass && minMass !== Infinity) {
      var vap0 = b0.getVelocityAtWorldPoint(now, pos0, Vec2d.alloc());
      var vap1 = b1.getVelocityAtWorldPoint(now, pos1, Vec2d.alloc());
      var velDiffAlongForceVec = vap1.subtract(vap0).projectOnto(pullForceVec);
      var dampAccel = velDiffAlongForceVec.scale(-dampFraction);
      var dampForceVec = dampAccel.scale(minMass);
      totalForceVec.add(dampForceVec);
      vap0.free();
      vap1.free();
    }

    // apply forces
    x = beamLength / maxDist;
    totalForceVec.clipToMaxLength(maxForce * (1 - x * x));
    b1.applyForceAtWorldPosAndTime(totalForceVec, pos1, now);
    b0.applyForceAtWorldPosAndTime(totalForceVec.scale(-1), pos0, now);
    forceMag = totalForceVec.magnitude();
    totalForceVec.free();
  }
  p0p1.free();
  return forceMag;
};