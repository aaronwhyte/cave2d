/**
 * @constructor
 * @extends {Spirit}
 */
function GnomeSpirit(game) {
  Spirit.call(this);
  this.game = game;
  this.id = -1;
  this.bodyId = -1;
  this.vec = new Vec2d();;
  this.excitement = 0;
  this.twist = 0;
  this.lastTargetPos = new Vec2d();
  this.goToLastTargetPos = false;
}

GnomeSpirit.EXCITED_TIMEOUT = 2;
GnomeSpirit.BORED_TIMEOUT = 5;
GnomeSpirit.MAX_SCAN_DIST = 22;
GnomeSpirit.CHASE_ACCEL = 0.45;
GnomeSpirit.WANDER_ACCEL = 0.3;
GnomeSpirit.FRICTION = 0.4;
GnomeSpirit.TWIST_DURATION = 2;

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
    req.hitGroup = Fracas2.Group.GNOME_SCAN;
    req.shape = Body.Shape.CIRCLE;
    req.rad = 0.1;
    req.pos.set(gnomePos);
    req.vel.set(targetPos).subtract(gnomePos);
    var resp = ScanResponse.alloc();
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
      this.lastTargetPos.set(targetPos);
      this.goToLastTargetPos = true;
      this.twist = 0;
      this.excitement = 30;

      this.vec.set(this.lastTargetPos).subtract(gnomePos).scaleToLength(GnomeSpirit.CHASE_ACCEL);
      this.vec.add(b.vel);
    } else if (this.excitement >= 1) {
      this.excitement--;
      // Have we arrived at the last place the target was spotted?
      if (this.goToLastTargetPos && gnomePos.distance(this.lastTargetPos) < 2 * Fracas2.CHARACTER_RADIUS) {
        // Yes - cancel search.
        this.goToLastTargetPos = false;
      }
      if (this.goToLastTargetPos) {
        // Go to that spot.
        this.twist = 0;
        this.vec.set(this.lastTargetPos).subtract(gnomePos).scaleToLength(GnomeSpirit.CHASE_ACCEL);
        this.vec.add(b.vel);
      } else {
        this.vec.set(b.vel).scaleToLength(GnomeSpirit.CHASE_ACCEL * 0.75)
            .addXY(
                0.25 * GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5),
                0.25 * GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5))
            .add(b.vel);
      }
    } else {
      // Probably on screen, but out of excitement.
      this.goToLastTargetPos = false;
      this.excitement = 0;
      this.vec.set(b.vel).scaleToLength(GnomeSpirit.WANDER_ACCEL)
          .addXY(
              0.1 * GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5),
              0.1 * GnomeSpirit.WANDER_ACCEL * (Math.random() - 0.5))
          .add(b.vel);
    }

    if (this.twist) {
      this.vec.rot(Math.sign(this.twist) * Math.PI * 0.5 / GnomeSpirit.TWIST_DURATION);
      this.twist -= Math.sign(this.twist);
    }
    this.vec.scale(1 - GnomeSpirit.FRICTION);
    b.setVelAtTime(this.vec, world.now);
    b.invalidatePath();

  } else {

    // Probably off the screen. Become inert.
    this.goToLastTargetPos = false;
    this.excitement = 0;
    this.twist = 0;
    var speedSq = b.vel.magnitudeSquared();
    if (speedSq == 0) {
      // do nothing
    } else if (speedSq < 0.1) {
      // stop
      b.setVelAtTime(Vec2d.ZERO, world.now);
      b.invalidatePath();
    } else {
      this.vec.scale(1 - GnomeSpirit.FRICTION);
      b.setVelAtTime(this.vec, world.now);
      b.invalidatePath();
    }
  }
  world.addTimeout(
      world.now + (this.excitement >= 1 ? GnomeSpirit.EXCITED_TIMEOUT : GnomeSpirit.BORED_TIMEOUT),
      this.id, null);

  gnomePos.free();
  targetPos.free();
};

GnomeSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  if (world.spirits[thatBody.spiritId] instanceof BulletSpirit) {
    return Fracas2.Reaction.DESTROY_GNOME;
  } else {
    this.twist = GnomeSpirit.TWIST_DURATION * (Math.random() < 0.5 ? -1 : 1);
  }
  thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(0.9), hit.time);
  return Fracas2.Reaction.BOUNCE;
};
