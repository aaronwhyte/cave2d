/**
 * Accelerates colliding bodies.
 * @constructor
 */
function HitResolver() {
  this.defaultElasticity = 0.99;
  this.v1 = new Vec2d();
  this.v2 = new Vec2d();

}

/**
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {Body} b0
 * @param {Body} b1
 */
HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1) {
  if (b0.mass == Infinity && b1.mass == Infinity) return;

  // Shift b0 to the origin, holding still.
  var vel = Vec2d.alloc().set(b1.vel).subtract(b0.vel);

  // Calculate accel needed for inelastic resolution.
  // Calc accel along the collision vector by enough to cancel velocity along that direction.
  var accel = Vec2d.alloc().set(vel).projectOnto(collisionVec);
  // Add onto that for elastic collision.
  accel.scale(-1 - this.defaultElasticity);
  if (!accel.equals(Vec2d.ZERO)) {
    // Use masses to decide which body gets accelerated by how much.
    if (b0.mass == Infinity) {
      b1.setVelAtTime(accel.add(b1.vel), time);
    } else if (b1.mass == Infinity) {
      b0.setVelAtTime(accel.scale(-1).add(b0.vel), time);
    } else {
      var work = Vec2d.alloc();
      var massTotal = b0.mass + b1.mass;

      var frac0 = b1.mass / massTotal;
      work.set(accel).scale(-frac0).add(b0.vel);
      b0.setVelAtTime(work, time);

      var frac1 = b0.mass / massTotal;
      work.set(accel).scale(frac1).add(b1.vel);
      b1.setVelAtTime(work, time);
      work.free();
    }
  }
  vel.free();

  // Angular stuff
  if (b0.turnable || b1.turnable) {
    var hitPos = this.getHitPos(time, collisionVec, b0, b1, Vec2d.alloc());
    //debugger;
    var surfaceVec = Vec2d.alloc().set(collisionVec).rot90Right();
    var v0 = this.getVelocityAtPoint(time, b0, hitPos, Vec2d.alloc()).projectOnto(surfaceVec);
    var v1 = this.getVelocityAtPoint(time, b1, hitPos, Vec2d.alloc()).projectOnto(surfaceVec);
    // TODO: grip average? OK?
    var grip = 0.6;//(b0.grip + b1.grip) / 2;
    accel.set(v1).subtract(v0).scale(-grip);
    if (!accel.equals(Vec2d.ZERO)) {
      if (b0.mass == Infinity) {
        //b1.applyForceAtWorldPosAndTime(accel.scale(b1.moi / b1.rad), hitPos, time);
      } else if (b1.mass == Infinity) {
        //b0.applyForceAtWorldPosAndTime(accel.scale(-1).scale(b0.moi / b0.rad), hitPos, time);
      } else {
        // TODO force is wrong?
        var force = accel.scale(Math.min(b0.moi/b0.rad, b1.moi/b1.rad));
        b1.applyForceAtWorldPosAndTime(force, hitPos, time);
        b0.applyForceAtWorldPosAndTime(force.scale(-1), hitPos, time);
        var v0 = this.getVelocityAtPoint(time, b0, hitPos, v0);
        var v1 = this.getVelocityAtPoint(time, b1, hitPos, v1);
        console.log(v1.subtract(v0).projectOnto(surfaceVec));
      }
    }
    v1.free();
    v0.free();
    surfaceVec.free();
    hitPos.free();
  }
  accel.free();
};

HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  if (b0.shape == Body.Shape.CIRCLE) {
    if (b1.shape == Body.Shape.CIRCLE) {
      return this.getHitPosCircCirc(time, collisionVec, b0, b1, out);
    } else {
      return this.getHitPosCircRect(time, collisionVec, b0, b1, out);
    }
  } else {
    if (b1.shape == Body.Shape.CIRCLE) {
      return this.getHitPosCircRect(time, collisionVec, b1, b0, out);
    } else {
      return this.getHitPosRectRect(time, collisionVec, b1, b0, out);
    }
  }
};

HitResolver.prototype.getVelocityAtPoint = function(now, body, point, out) {
  if (!body.turnable || !body.angVel) {
    return out.set(body.vel);
  }
  return body.getPosAtTime(now, out).subtract(point).scale(body.angVel).rot90Right().add(body.vel);
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
