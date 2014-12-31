/**
 * @constructor
 * @extends {Spirit}
 */
function GnomeSpirit() {
  Spirit.call(this);
  this.id = -1;
  this.bodyId = -1;
  this.vec = Vec2d.alloc();
  this.excitement = 0;
}

GnomeSpirit.EXCITED_TIMEOUT = 2;
GnomeSpirit.BORED_TIMEOUT = 7;
GnomeSpirit.MAX_SCAN_DIST = 18;
GnomeSpirit.CHASE_ACCEL = 0.6;
GnomeSpirit.WANDER_ACCEL = 0.2;

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
  var dist = gnomePos.distance(targetPos);
  var targetInRange = dist <= GnomeSpirit.MAX_SCAN_DIST;

  // The odds of scanning fall off after half the scan dist
  if (targetInRange && (Math.random() + 1) * 0.5 > dist / GnomeSpirit.MAX_SCAN_DIST) {
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
  if (targetInRange) {
    if (targetSeen) {
      if (this.excitement < 50) {
        this.excitement += 10;
      }
      this.vec.set(targetPos).subtract(gnomePos).scaleToLength(GnomeSpirit.CHASE_ACCEL);
      this.vec.add(b.vel);
    } else if (this.excitement >= 1) {
      this.excitement--;
      this.vec.set(b.vel).scaleToLength(GnomeSpirit.WANDER_ACCEL)
          .rot(0.9 * (Math.random() - 0.5))
          .addXY(
              GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5),
              GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5))
          .add(b.vel);
    } else {
      this.excitement = 0;
      this.vec.set(b.vel)
          .addXY(
              GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5),
              GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5));
    }
    this.vec.scale(0.6);
    this.vec.rot(0.5 * (Math.random() - 0.5));
    b.setVelAtTime(this.vec, world.now);
    b.invalidatePath();
  } else {
    this.excitement = 0;
    this.vec.set(b.vel).scale(0.3);
    b.setVelAtTime(this.vec, world.now);
    b.invalidatePath();
  }

  world.addTimeout(
      world.now + (this.excitement >= 1 ? GnomeSpirit.EXCITED_TIMEOUT : GnomeSpirit.BORED_TIMEOUT),
      this.id, null);

  gnomePos.free();
  targetPos.free();
};

GnomeSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(0.9), hit.time);
};
