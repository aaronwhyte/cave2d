/**
 * @constructor
 * @extends {BaseSpirit}
 */
function BulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game6Key.BULLET;

  this.color = new Vec4();

  // temps
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  // trail stuff
  this.trail = new Trail(10);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.reset(screen);
}
BulletSpirit.prototype = new BaseSpirit();
BulletSpirit.prototype.constructor = BulletSpirit;

BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL = 1;

BulletSpirit.prototype.reset = function(screen) {
  BaseSpirit.prototype.reset.call(this, screen);

  this.color.reset();

  // temps
  this.mat44.reset();
  this.modelMatrix.reset();
  this.modelMatrix2.reset();

  // trail stuff
  this.trail.reset();
  this.segStartVec.reset();
  this.segEndVec.reset();

  this.stun = 15;
  this.trailDuration = 0.8;
  this.headRadFraction = 1;
  this.tailRadFraction = 0.25;

  this.bounceChance = 0;

  // When force is applied to a bullet, detect that while drawing and update the trail
  this.lastVel = new Vec2d();

  return this;
};

BulletSpirit.pool = [];

BulletSpirit.alloc = function(screen) {
  if (BulletSpirit.pool.length) {
    return BulletSpirit.pool.pop().reset(screen);
  }
  return new BulletSpirit(screen);
};

BulletSpirit.prototype.free = function() {
  BulletSpirit.pool.push(this);
};

BulletSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

BulletSpirit.prototype.onDraw = function(world, renderer) {
  if (this.getBody()) {
    let vel = this.getBodyVel();
    if (!vel.equals(this.lastVel)) {
      // Somebody's bullet-bending!
      this.addTrailSegment();
    }
  }
  this.drawTrail();
};

BulletSpirit.prototype.addTrailSegment = function() {
  let now = this.screen.now();
  let body = this.getBody();
  this.rad = body.rad;
  this.trail.append(now, this.getBodyPos(), body.vel);
  this.lastVel.set(body.vel);
};

BulletSpirit.prototype.drawTrail = function() {
  let maxTime = this.now();
  let duration = this.trailDuration;
  let minTime = maxTime - duration;
  let trailWarm = false;

  this.headRad = this.rad * this.headRadFraction;
  this.tailRad = this.rad * this.tailRadFraction;
  for (let i = 0; i < this.trail.size(); i++) {
    let segStartTime = this.trail.getSegmentStartTime(i);
    let segEndTime = this.trail.getSegmentEndTime(i);
    let drawStartTime = Math.max(segStartTime, minTime);
    let drawEndTime = Math.min(segEndTime, maxTime);
    if (drawStartTime <= drawEndTime) {
      trailWarm = true;
      // something to draw
      this.trail.getSegmentPosAtTime(i, drawStartTime, this.segStartVec);
      this.trail.getSegmentPosAtTime(i, drawEndTime, this.segEndVec);

      let startRad = this.tailRad + (this.headRad - this.tailRad) * (drawStartTime - minTime) / duration;
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0.5))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));

      let endRad = this.tailRad + (this.headRad - this.tailRad) * (drawEndTime - minTime) / duration;
      this.modelMatrix2.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segEndVec.x, this.segEndVec.y, 0.5))
          .multiply(this.mat44.toScaleOpXYZ(endRad, endRad, 1));

      this.screen.drawModel(ModelId.CYLINDER_32, this.color, this.modelMatrix, this.modelMatrix2);
    }
  }
  if (!trailWarm) {
    // The trail has ended and the last spark has faded.
    this.destroy();
  }
};

BulletSpirit.prototype.destroy = function() {
  // removeSpiritId also frees any spirit that can be freed,
  // so don't double-free or terrible things happen!
  this.screen.world.removeSpiritId(this.id);
  if (this.bodyId) {
    console.error("The trail is cold but the body is unburied. bodyId: " + this.bodyId);
  }
};

/**
 * @override
 */
BulletSpirit.prototype.startTimeouts = function() {
  // ignore
};

BulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (timeoutVal === BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL) {
    let body = this.getBody();
    if (body) {
      this.screen.splashes.addDotSplash(this.now(), this.getBodyPos(), body.rad * this.headRadFraction * 1.5, 5,
          this.color.getR(), this.color.getG(), this.color.getB());
    }
    this.destroyBody();
  }
};

BulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

BulletSpirit.prototype.die = function() {
  let body = this.getBody();
  if (body) {
    let rad = body.rad * this.headRadFraction;
    this.screen.splashes.addDotSplash(this.now(), this.getBodyPos(), rad * 2, 5,
        this.color.getR(), this.color.getG(), this.color.getB());
    this.screen.splashes.addBulletHitExplosion(this.now(), this.getBodyPos(), rad * 2.5,
        this.color);
  }
  this.destroyBody();
};

BulletSpirit.prototype.onAfterHitWall = function(collisionVec, mag) {
  let body = this.getBody();
  if (!body) return;
  let pos = this.getBodyPos();

  this.screen.sounds.wallThump(this.getBodyPos(), Math.min(1, mag + 0.5));

  // bounce or vanish?
  if (Math.random() >= this.bounceChance) {
    // vanish
    this.die();
  } else {
    // bounce
    this.addTrailSegment();
    this.screen.splashes.addDotSplash(this.now(), this.getBodyPos(), body.rad * (1 + Math.min(mag, 2)), 4,
        this.color.getR(), this.color.getG(), this.color.getB());
    this.screen.sounds.wallThump(this.getBodyPos(), Math.min(1, mag * 2));
  }
};
