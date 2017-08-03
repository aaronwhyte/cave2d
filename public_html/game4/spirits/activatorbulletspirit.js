/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ActivatorBulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.ACTIVATOR_BULLET;

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
ActivatorBulletSpirit.prototype = new BaseSpirit();
ActivatorBulletSpirit.prototype.constructor = ActivatorBulletSpirit;

ActivatorBulletSpirit.INPUT_DURATION = 1.2 * 1.5;

ActivatorBulletSpirit.prototype.reset = function(screen) {
  BaseSpirit.prototype.reset.call(this, screen);

  this.color.reset();

  // temps
  this.mat44.reset();
  this.modelMatrix.reset();

  // trail stuff
  this.trail.reset();
  this.segStartVec.reset();
  this.segEndVec.reset();

  return this;
};

ActivatorBulletSpirit.pool = [];

ActivatorBulletSpirit.alloc = function(screen) {
  if (ActivatorBulletSpirit.pool.length) {
    return ActivatorBulletSpirit.pool.pop().reset(screen);
  }
  return new ActivatorBulletSpirit(screen);
};

ActivatorBulletSpirit.prototype.free = function() {
  ActivatorBulletSpirit.pool.push(this);
};

ActivatorBulletSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

ActivatorBulletSpirit.getJsoner = function() {
  if (!ActivatorBulletSpirit.jsoner) {
    ActivatorBulletSpirit.jsoner = new Jsoner(ActivatorBulletSpirit.SCHEMA);
  }
  return ActivatorBulletSpirit.jsoner;
};

ActivatorBulletSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ActivatorBulletSpirit.createModel = function() {
  return RigidModel.createCircle(13)
      .setColorRGB(1, 1, 1);
};

ActivatorBulletSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

ActivatorBulletSpirit.prototype.onHitActivatable = function(otherSpirit, pos) {
  otherSpirit.addInputPulse(this.now() + ActivatorBulletSpirit.INPUT_DURATION, 1);
  this.destroyBody();
};

ActivatorBulletSpirit.prototype.onHitOther = function(pos) {
  this.destroyBody();
};

ActivatorBulletSpirit.prototype.onDraw = function(world, renderer) {
  this.drawTrail();
};

ActivatorBulletSpirit.prototype.addTrailSegment = function() {
  var body = this.getBody();
  this.rad = body.rad;
  this.trail.append(this.now(), this.getBodyPos(), body.vel);
};

ActivatorBulletSpirit.prototype.drawTrail = function() {
  var maxTime = this.now();
  var duration = 2;
  var minTime = maxTime - duration;
  var trailWarm = false;
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

      var startRad = this.rad * (drawStartTime - minTime) / (maxTime - minTime);
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));
      this.screen.renderer.setModelMatrix(this.modelMatrix);

      var endRad = this.rad * (drawEndTime - minTime) / (maxTime - minTime);
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

ActivatorBulletSpirit.prototype.destroy = function() {
  // removeSpiritId also frees any spirit that can be freed,
  // so don't double-free or terrible things happen!
  this.screen.world.removeSpiritId(this.id);
  if (this.bodyId) {
    console.error("The trail is cold but the body is unburied. bodyId: " + this.bodyId);
  }
};

ActivatorBulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
  this.destroyBody();
};

ActivatorBulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

ActivatorBulletSpirit.prototype.toJSON = function() {
  return ActivatorBulletSpirit.getJsoner().toJSON(this);
};

ActivatorBulletSpirit.prototype.setFromJSON = function(json) {
  ActivatorBulletSpirit.getJsoner().setFromJSON(json, this);
};

