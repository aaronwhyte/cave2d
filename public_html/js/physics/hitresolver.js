/**
 * Accelerates colliding bodies.
 * @constructor
 */
function HitResolver() {
  this.defaultElasticity = 0.99;
}

/**
 * @param {WorldEvent} e
 * @param {Body} b0
 * @param {Body} b1
 */
HitResolver.prototype.resolveHit = function(e, b0, b1) {
  if (b0.mass == Infinity && b1.mass == Infinity) return;
  var pos0 = b0.getPosAtTime(e.time, Vec2d.alloc());
  var pos1 = b1.getPosAtTime(e.time, Vec2d.alloc());

  // Shift b0 to the origin, holding still.
  var vel = Vec2d.alloc().set(b1.vel).subtract(b0.vel);

  // Calculate accel needed for inelastic resolution.
  // Calc accel along the collision vector by enough to cancel velocity along that direction.
  var accel = Vec2d.alloc().set(vel).projectOnto(e.collisionVec);
  // Add onto that for elastic collision.
  accel.scale(-1 - this.defaultElasticity);
  if (accel.equals(Vec2d.ZERO)) {
    accel.free();
    pos0.free();
    pos1.free();
    return;
  }
  if (accel.magnitudeSquared() < 0.001 * 0.001) {
    accel.scaleToLength(0.001);
  }

  // Use masses to decide which body gets accelerated by how much.
  if (b0.mass == Infinity) {
    b1.setVelAtTime(accel.add(b1.vel), e.time);
  } else if (b1.mass == Infinity) {
    b0.setVelAtTime(accel.scale(-1).add(b0.vel), e.time);
  } else {
    var work = Vec2d.alloc();
    var massTotal = b0.mass + b1.mass;

    var frac0 = b1.mass / massTotal;
    work.set(accel).scale(-frac0).add(b0.vel);
    b0.setVelAtTime(work, e.time);

    var frac1 = b0.mass / massTotal;
    work.set(accel).scale(frac1).add(b1.vel);
    b1.setVelAtTime(work, e.time);
    work.free();
  }
  accel.free();
  pos0.free();
  pos1.free();
};