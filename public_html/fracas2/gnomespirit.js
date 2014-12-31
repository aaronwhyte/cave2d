/**
 * @constructor
 * @extends {Spirit}
 */
function GnomeSpirit() {
  Spirit.call(this);
  this.id = -1;
  this.bodyId = -1;
  this.vec = Vec2d.alloc();
}

GnomeSpirit.TIMEOUT = 1;
GnomeSpirit.MAX_SCAN_DIST = 15;
GnomeSpirit.CHASE_ACCEL = 0.2;
GnomeSpirit.WANDER_ACCEL = 0.04;

GnomeSpirit.prototype = new Spirit();
GnomeSpirit.prototype.constructor = GnomeSpirit;

GnomeSpirit.prototype.setTargetBody = function(body) {
  this.targetBody = body;
};

GnomeSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.bodies[this.bodyId];
  var targetSeen = false;

  // Is the player close enough for rayscan?
  var gnomePos = b.getPosAtTime(world.now, Vec2d.alloc());
  var targetPos = this.targetBody.getPosAtTime(world.now, Vec2d.alloc());
  var targetInRange = gnomePos.distance(targetPos) <= GnomeSpirit.MAX_SCAN_DIST;
  if (targetInRange) {
    var req = ScanRequest.alloc();
    req.hitGroup = 0;
    req.shape = Body.Shape.CIRCLE;
    req.rad = 0.1;
    req.pos.set(gnomePos);
    var resp = ScanResponse.alloc();
    req.vel.set(targetPos).subtract(gnomePos);
    if (world.rayscan(req, resp)) {
      var hitBody = world.getBodyByPathId(resp.pathId);
      if (hitBody.id == this.targetBody.id) {
        targetSeen = true;
      }
    }
    req.free();
    resp.free();
  }
  if (targetSeen) {
    this.vec.set(targetPos).subtract(gnomePos).scaleToLength(GnomeSpirit.CHASE_ACCEL);
    this.vec.add(b.vel);
  } else {
    this.vec.set(b.vel).scaleToLength(GnomeSpirit.WANDER_ACCEL).add(b.vel).addXY(
            GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5),
            GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5));
  }
  this.vec.rot(0.6 * (Math.random() - 0.5));
  this.vec.scale(0.8);
  b.setVelAtTime(this.vec, world.now);
  b.invalidatePath();
  world.addTimeout(world.now + GnomeSpirit.TIMEOUT, this.id, null);

  gnomePos.free();
  targetPos.free();
};

GnomeSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(0.9), hit.time);
};
