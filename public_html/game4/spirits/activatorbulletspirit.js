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
  this.vec4 = new Vec4();

  // trail stuff
  this.trail = new Trail(2);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.reset(screen);
}
ActivatorBulletSpirit.prototype = new BaseSpirit();
ActivatorBulletSpirit.prototype.constructor = ActivatorBulletSpirit;

ActivatorBulletSpirit.INPUT_DURATION = 1.42; // just under the gun's timeout time

ActivatorBulletSpirit.prototype.reset = function(screen) {
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

ActivatorBulletSpirit.prototype.onHitOther = function(collisionVeg, mag, otherBody, otherSpirit) {
  if (otherSpirit && otherSpirit.isActivatable()) {
    otherSpirit.addInputPulse(this.now() + ActivatorBulletSpirit.INPUT_DURATION, 1);
  }
  this.destroyBody();
};

ActivatorBulletSpirit.prototype.onDraw = function(world, renderer) {
  // let body = this.getBody();
  // if (body && this.modelStamp) {
  //   let pos = this.getBodyPos();
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
  this.drawTrail();
};

ActivatorBulletSpirit.prototype.addTrailSegment = function() {
  let body = this.getBody();
  this.headRad = body.rad;
  this.tailRad = 0;
  this.trail.append(this.now(), this.getBodyPos(), body.vel);
};

ActivatorBulletSpirit.prototype.drawTrail = function() {
  let maxTime = this.now();
  let duration = 3;
  let minTime = maxTime - duration;
  let trailWarm = false;
  this.screen.renderer
      .setStamp(this.stamps.cylinderStamp)
      .setColorVector(this.color);
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
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));
      this.screen.renderer.setModelMatrix(this.modelMatrix);

      let endRad = this.tailRad + (this.headRad - this.tailRad) * (drawEndTime - minTime) / duration;
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

