/**
 * @constructor
 * @extends {BaseSpirit}
 */
function TractorBulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.TRACTOR_BULLET;

  this.color = new Vec4();

  // negative values are repulsion
  this.attraction = 1;

  // temps
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.vec4 = new Vec4();

  // trail stuff
  this.trail = new Trail(2);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.reset(screen);
}
TractorBulletSpirit.prototype = new BaseSpirit();
TractorBulletSpirit.prototype.constructor = TractorBulletSpirit;

TractorBulletSpirit.prototype.reset = function(screen) {
  BaseSpirit.prototype.reset.call(this, screen);

  this.color.reset();

  // temps
  this.mat44.reset();
  this.modelMatrix.reset();
  this.vec4.reset();

  // trail stuff
  this.trail.reset();
  this.segStartVec.reset();
  this.segEndVec.reset();

  return this;
};

TractorBulletSpirit.pool = [];

TractorBulletSpirit.alloc = function(screen) {
  if (TractorBulletSpirit.pool.length) {
    return TractorBulletSpirit.pool.pop().reset(screen);
  }
  return new TractorBulletSpirit(screen);
};

TractorBulletSpirit.prototype.free = function() {
  TractorBulletSpirit.pool.push(this);
};

TractorBulletSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "attraction"
};

TractorBulletSpirit.getJsoner = function() {
  if (!TractorBulletSpirit.jsoner) {
    TractorBulletSpirit.jsoner = new Jsoner(TractorBulletSpirit.SCHEMA);
  }
  return TractorBulletSpirit.jsoner;
};

TractorBulletSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

TractorBulletSpirit.createModel = function() {
  return RigidModel.createCircle(11)
      .setColorRGB(1, 1, 1);
};

TractorBulletSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

TractorBulletSpirit.prototype.onHitOther = function(pos) {
  // TODO splash
  this.destroyBody();
};

TractorBulletSpirit.prototype.onDraw = function(world, renderer) {
  // var body = this.getBody();
  // if (body && this.modelStamp) {
  //   var pos = this.getBodyPos();
  //   this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  //   if (this.viewportsFromCamera < 1.1) {
  //     renderer
  //         .setStamp(this.modelStamp)
  //         .setColorVector(this.vec4.set(this.color));
  //     this.modelMatrix.toIdentity()
  //         .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
  //         .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
  //         .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
  //     renderer.setModelMatrix(this.modelMatrix);
  //     renderer.drawStamp();
  //   }
  // }
  //this.drawTrail();
};

TractorBulletSpirit.prototype.addTrailSegment = function() {
  var body = this.getBody();
  this.headRad = body.rad;
  this.tailRad = 0;
  this.trail.append(this.now(), this.getBodyPos(), body.vel);
};

TractorBulletSpirit.prototype.drawTrail = function() {
  var maxTime = this.now();
  var duration = 1.7;
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

TractorBulletSpirit.prototype.destroy = function() {
  // removeSpiritId also frees any spirit that can be freed,
  // so don't double-free or terrible things happen!
  this.screen.world.removeSpiritId(this.id);
  if (this.bodyId) {
    console.error("The trail is cold but the body is unburied. bodyId: " + this.bodyId);
  }
};

TractorBulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
  this.destroyBody();
};

TractorBulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

TractorBulletSpirit.prototype.toJSON = function() {
  return TractorBulletSpirit.getJsoner().toJSON(this);
};

TractorBulletSpirit.prototype.setFromJSON = function(json) {
  TractorBulletSpirit.getJsoner().setFromJSON(json, this);
};

