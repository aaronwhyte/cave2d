/**
 * @constructor
 * @extends {BaseSpirit}
 */
function EnergyBulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game5BaseScreen.SpiritType.ENERGY_BULLET;

  this.color = new Vec4();

  this.energy = 1;

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
EnergyBulletSpirit.prototype = new BaseSpirit();
EnergyBulletSpirit.prototype.constructor = EnergyBulletSpirit;

EnergyBulletSpirit.prototype.reset = function(screen) {
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

EnergyBulletSpirit.pool = [];

EnergyBulletSpirit.alloc = function(screen) {
  if (EnergyBulletSpirit.pool.length) {
    return EnergyBulletSpirit.pool.pop().reset(screen);
  }
  return new EnergyBulletSpirit(screen);
};

EnergyBulletSpirit.prototype.free = function() {
  EnergyBulletSpirit.pool.push(this);
};

EnergyBulletSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "energy"
};

EnergyBulletSpirit.getJsoner = function() {
  if (!EnergyBulletSpirit.jsoner) {
    EnergyBulletSpirit.jsoner = new Jsoner(EnergyBulletSpirit.SCHEMA);
  }
  return EnergyBulletSpirit.jsoner;
};

EnergyBulletSpirit.prototype.onHitEnergizable = function(otherSpirit, pos) {
  otherSpirit.addEnergy(this.energy);
  this.destroyBody();
};

EnergyBulletSpirit.prototype.onHitOther = function(pos) {
  this.destroyBody();
};

EnergyBulletSpirit.prototype.onDraw = function(world, renderer) {
  this.drawTrail();
};

EnergyBulletSpirit.prototype.addTrailSegment = function() {
  let body = this.getBody();
  this.headRad = body.rad;
  this.tailRad = 0;
  this.trail.append(this.now(), this.getBodyPos(), body.vel);
};

EnergyBulletSpirit.prototype.drawTrail = function() {
  let maxTime = this.now();
  let duration = 3;
  let minTime = maxTime - duration;
  let trailWarm = false;
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
      let endRad = this.tailRad + (this.headRad - this.tailRad) * (drawEndTime - minTime) / duration;
      this.modelMatrix2.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segEndVec.x, this.segEndVec.y, 0))
          .multiply(this.mat44.toScaleOpXYZ(endRad, endRad, 1));
      this.screen.drawModel(ModelIds.CYLINDER_32, this.color, this.modelMatrix, this.modelMatrix2);
    }
  }
  if (!trailWarm) {
    // The trail has ended and the last spark has faded.
    this.destroy();
  }
};

EnergyBulletSpirit.prototype.destroy = function() {
  // removeSpiritId also frees any spirit that can be freed,
  // so don't double-free or terrible things happen!
  this.screen.world.removeSpiritId(this.id);
  if (this.bodyId) {
    console.error("The trail is cold but the body is unburied. bodyId: " + this.bodyId);
  }
};

EnergyBulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
  this.destroyBody();
};

EnergyBulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

EnergyBulletSpirit.prototype.toJSON = function() {
  return EnergyBulletSpirit.getJsoner().toJSON(this);
};

EnergyBulletSpirit.prototype.setFromJSON = function(json) {
  EnergyBulletSpirit.getJsoner().setFromJSON(json, this);
};

