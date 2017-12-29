/**
 * @constructor
 * @extends {BaseSpirit}
 */
function BulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.BULLET;

  this.color = new Vec4();

  // temps
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  // trail stuff
  this.trail = new Trail(4);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.reset(screen);
}
BulletSpirit.prototype = new BaseSpirit();
BulletSpirit.prototype.constructor = BulletSpirit;


BulletSpirit.prototype.reset = function(screen) {
  BaseSpirit.prototype.reset.call(this, screen);

  this.color.reset();

  // temps
  this.mat44.reset();
  this.modelMatrix.reset();

  // trail stuff
  this.trail.reset();
  this.segStartVec.reset();
  this.segEndVec.reset();

  this.toughness = 1;
  this.damage = 1;
  this.trailDuration = 0.8;

  this.wallDamageMultiplier = 1;

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

BulletSpirit.getJsoner = function() {
  if (!BulletSpirit.jsoner) {
    BulletSpirit.jsoner = new Jsoner(BulletSpirit.SCHEMA);
  }
  return BulletSpirit.jsoner;
};

BulletSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BulletSpirit.createModel = function() {
  return RigidModel.createCircle(24)
      .setColorRGB(1, 1, 1);
};

BulletSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BulletSpirit.prototype.onDraw = function(world, renderer) {
  this.drawTrail();
};

BulletSpirit.prototype.addTrailSegment = function() {
  var now = this.screen.now();
  var body = this.getBody();
  this.rad = body.rad;
  this.trail.append(now, this.getBodyPos(), body.vel);
};

BulletSpirit.prototype.drawTrail = function() {
  var maxTime = this.now();
  var duration = this.trailDuration;
  var minTime = maxTime - duration;
  var trailWarm = false;

  this.headRad = this.rad;
  this.tailRad = this.rad * 0.5;
  this.screen.renderer
      .setStamp(this.stamps.cylinderStamp)
      .setColorVector(this.color);
  for (var i = 0; i < this.trail.size(); i++) {
    var segStartTime = this.trail.getSegmentStartTime(i);
    var segEndTime = this.trail.getSegmentEndTime(i);
    var drawStartTime = Math.max(segStartTime, minTime);
    var drawEndTime = Math.min(segEndTime, maxTime);
    if (drawStartTime <= drawEndTime) {
      trailWarm = true;
      // something to draw
      this.trail.getSegmentPosAtTime(i, drawStartTime, this.segStartVec);
      this.trail.getSegmentPosAtTime(i, drawEndTime, this.segEndVec);

      var startRad = this.tailRad + (this.headRad - this.tailRad) * (drawStartTime - minTime) / duration;
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));
      this.screen.renderer.setModelMatrix(this.modelMatrix);

      var endRad = this.tailRad + (this.headRad - this.tailRad) * (drawEndTime - minTime) / duration;
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segEndVec.x, this.segEndVec.y, 0))
          .multiply(this.mat44.toScaleOpXYZ(endRad, endRad, 1));
      this.screen.renderer.setModelMatrix2(this.modelMatrix);
      this.screen.renderer.drawStamp();
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

BulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var body = this.getBody();
  if (body) {
    this.screen.splashes.addDotSplash(this.now(), this.getBodyPos(), body.rad * 1.5, 5,
        this.color.getR(), this.color.getG(), this.color.getB());
  }
  this.destroyBody();
};

BulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

BulletSpirit.prototype.toJSON = function() {
  return BulletSpirit.getJsoner().toJSON(this);
};

BulletSpirit.prototype.setFromJSON = function(json) {
  BulletSpirit.getJsoner().setFromJSON(json, this);
};

BulletSpirit.prototype.die = function() {
  var body = this.getBody();
  if (body) {
    this.screen.splashes.addDotSplash(this.now(), this.getBodyPos(), body.rad * 2, 5,
        this.color.getR(), this.color.getG(), this.color.getB());
    this.screen.splashes.addBulletHitExplosion(this.now(), this.getBodyPos(), body.rad * 2,
        this.color);
  }
  this.destroyBody();
};

BulletSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  var body = this.getBody();
  if (!body) return;

  this.screen.sounds.wallThump(this.getBodyPos(), mag);

  // bounce or vanish?
  this.applyDamage(mag * 0.7);
  if (this.health > 0) {
    // bounce
    this.addTrailSegment();
  }
};