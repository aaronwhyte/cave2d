/**
 * Accelerates colliding bodies.
 * @constructor
 */
function HitResolver() {
  this.defaultElasticity = 0.99;
  this.v1 = new Vec2d();
  this.v2 = new Vec2d();
}

HitResolver.VERIFY_KINETIC_ENERGY_PRESERVED = false;

/**
 * Performs all the physics mutations on two colliding bodies, based on the
 * contact point, masses, linear and angular velocities, elasticity, surface grip,
 * and whatever else I forgot.
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {Body} b0
 * @param {Body} b1
 * @param {Vec2d=} linearForceOut Optional output vec for recording center-to-center force applied to b0, or -f to b1
 * @param {Vec2d=} rubForceOut Optional output vec for recording rotational force applied to b0, or -f to b1
 * @return true if this resolved the hit, or false if it was ignored, either because both masses were infinite,
 * or because at lease one mass was zero.
 */
HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1, linearForceOut, rubForceOut) {
  if (b0.mass === Infinity && b1.mass === Infinity) return false;
  if (b0.mass === 0 || b1.mass === 0) return false;

  if (HitResolver.VERIFY_KINETIC_ENERGY_PRESERVED) {
    var ke0 = b0.getKineticEnergy();
    var ke1 = b1.getKineticEnergy();
  }

  // Shift b0 to the origin, holding still.
  var vel = Vec2d.alloc().set(b1.vel).subtract(b0.vel);

  // Calculate accel needed for inelastic resolution.
  // Calc accel along the collision vector by enough to cancel velocity along that direction.
  var accel = Vec2d.alloc().set(vel).projectOnto(collisionVec);
  // Add onto that for elastic collision.
  accel.scale(-1 - b0.elasticity * b1.elasticity);
  if (!accel.equals(Vec2d.ZERO)) {
    // Use masses to decide which body gets accelerated by how much.
    if (b0.mass === Infinity) {
      b1.addVelAtTime(accel, time);
      if (linearForceOut) linearForceOut.set(accel).scale(-b1.mass);
    } else if (b1.mass === Infinity) {
      b0.addVelAtTime(accel.scale(-1), time);
      if (linearForceOut) linearForceOut.set(accel).scale(b0.mass);
    } else {
      var work = Vec2d.alloc();
      var massTotal = b0.mass + b1.mass;

      var frac0 = b1.mass / massTotal;
      work.set(accel).scale(-frac0);
      if (linearForceOut) linearForceOut.set(work).scale(b0.mass);
      b0.addVelAtTime(work, time);

      var frac1 = b0.mass / massTotal;
      work.set(accel).scale(frac1);
      b1.addVelAtTime(work, time);
      work.free();
    }
  }
  vel.free();
  accel.free();

  // Surface rub force, perpendicular to the center-to-center force above.
  var grip = b0.grip * b1.grip;
  if (grip) {
    var hitPos = this.getHitPos(time, collisionVec, b0, b1, Vec2d.alloc());
    var surfaceUnitVec = Vec2d.alloc().set(collisionVec).rot90Right().scaleToLength(1);

    var p0 = b0.getPosAtTime(time, Vec2d.alloc());
    var p1 = b1.getPosAtTime(time, Vec2d.alloc());

    var d0 = Vec2d.distance(p0.x, p0.y, hitPos.x, hitPos.y);
    var d1 = Vec2d.distance(p1.x, p1.y, hitPos.x, hitPos.y);

    var vap0 = b0.getVelocityAtWorldPoint(time, hitPos, Vec2d.alloc()).projectOnto(surfaceUnitVec);
    var vap1 = b1.getVelocityAtWorldPoint(time, hitPos, Vec2d.alloc()).projectOnto(surfaceUnitVec);

    var reciprocalMass0 = b0.getReciprocalMassAlongTangentAtDistance(d0);
    var reciprocalMass1 = b1.getReciprocalMassAlongTangentAtDistance(d1);
    var reciprocalMass = reciprocalMass0 + reciprocalMass1;
    if (reciprocalMass) {
      var forceScale = grip * (vap1.dot(surfaceUnitVec) - vap0.dot(surfaceUnitVec)) / reciprocalMass;
      var force = Vec2d.alloc().set(surfaceUnitVec).scaleToLength(forceScale);
      b0.applyForceAtWorldPosAndTime(force, hitPos, time);
      b1.applyForceAtWorldPosAndTime(force.scale(-1), hitPos, time);
      if (rubForceOut) rubForceOut.set(force);
      force.free();
    }
    vap1.free();
    vap0.free();
    p1.free();
    p0.free();
    surfaceUnitVec.free();
    hitPos.free();
  }

  if (HitResolver.VERIFY_KINETIC_ENERGY_PRESERVED) {
    var ke0b = b0.getKineticEnergy();
    var ke1b = b1.getKineticEnergy();
    var diff = (ke0b + ke1b) - (ke0 + ke1);
    if (diff > 0) {
      console.log("before:", ke0, ke1, "after:", ke0b, ke1b);
      console.log("diff:", diff);
    }
  }
  return true;
};

/**
 * Calculates the world position of a collision contact point.
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {Body} b0
 * @param {Body} b1
 * @param {Vec2d} out where the output goes.
 */
HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  if (b0.shape === Body.Shape.CIRCLE) {
    if (b1.shape === Body.Shape.CIRCLE) {
      return this.getHitPosCircCirc(time, collisionVec, b0, b1, out);
    } else {
      return this.getHitPosCircRect(time, collisionVec, b0, b1, out);
    }
  } else {
    if (b1.shape === Body.Shape.CIRCLE) {
      return this.getHitPosCircRect(time, collisionVec, b1, b0, out);
    } else {
      return this.getHitPosRectRect(time, collisionVec, b1, b0, out);
    }
  }
};

//////////////
// internal
//////////////

HitResolver.prototype.getHitPosCircCirc = function(time, collisionVec, b0, b1, out) {
  var p0 = b0.getPosAtTime(time, this.v1);
  var p1 = b1.getPosAtTime(time, this.v2);
  return out.set(p1).subtract(p0).scaleToLength(b0.rad).add(p0);
};

HitResolver.prototype.getHitPosCircRect = function(time, collisionVec, b0, b1, out) {
  var p0 = b0.getPosAtTime(time, this.v1);
  var p1 = b1.getPosAtTime(time, this.v2);
  return out.set(p1).subtract(p0).projectOnto(collisionVec).scaleToLength(b0.rad).add(p0);
};

HitResolver.prototype.getHitPosRectRect = function(time, collisionVec, b0, b1, out) {
  var p0 = b0.getPosAtTime(time, this.v1);
  var p1 = b1.getPosAtTime(time, this.v2);
  // TODO: this is totally not accurate. But I don't care much about rect/rect collisions.
  return out.set(p1).subtract(p0).projectOnto(collisionVec).scale(0.5).add(p0);
};
