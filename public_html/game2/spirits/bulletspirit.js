/**
 * @constructor
 * @extends {BaseSpirit}
 */
function BulletSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = BaseScreen.SpiritType.BULLET;

  this.color = new Vec4();

  // temps
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.trail = new Trail(4);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.health = 1;
  this.digChance = 0.1;
  this.bounceChance = 0.1;
}
BulletSpirit.prototype = new BaseSpirit();
BulletSpirit.prototype.constructor = BulletSpirit;

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

BulletSpirit.prototype.onHitWall = function(mag) {
  var body = this.getBody();
  if (!body) return;
  var pos = this.getBodyPos();
  if (this.digChance * mag > Math.random()) {
    var pillRad = body.rad + 0.5;
    this.screen.drawTerrainPill(pos, pos, pillRad, 1);
    this.wallDamageSplash(pos, pillRad);
    this.screen.soundBing(pos);
    this.destroyBody();
  } else {
    // bounce or vanish?
    this.health -= mag;
    if (this.bounceChance - mag > Math.random()) {
      // bounce
      this.addTrailSegment();
    } else {
      // vanish
      this.destroyBody();
      this.wallDamageSplash(pos, body.rad);
    }
    this.screen.soundWallThump(pos, mag * body.mass);
  }
};

BulletSpirit.prototype.onHitEnemy = function(mag) {
  var body = this.getBody();
  if (!body) return;
  var pos = this.getBodyPos();
  this.screen.soundWallThump(pos, mag);
  this.wallDamageSplash(pos, Math.random());
  this.destroyBody();
};

BulletSpirit.prototype.onHitOther = function(mag) {
  var body = this.getBody();
  if (!body) return;
  // bounce or vanish?
  this.health -= mag / 5;
  if (this.health <= 0) {
    // vanish
    this.destroyBody();
  } else {
    // bounce
    this.addTrailSegment();
    this.wallDamageSplash(this.getBodyPos(), body.rad);
  }
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
  var duration = 2;
  var minTime = maxTime - duration;
  var trailWarm = false;
  this.screen.renderer
      .setStamp(this.screen.cylinderStamp)
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
    this.screen.world.removeSpiritId(this.id);
    if (this.bodyId) console.error("The trail is cold but the body is unburied!");
    this.trail.clear();
  }
};

BulletSpirit.prototype.wallDamageSplash = function(pos, rad) {
  var s = this.screen.splash;
  s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.tubeStamp);

  s.startTime = this.now();
  s.duration = 4 + (2 * rad);

  var x = pos.x;
  var y = pos.y;

  var endRad = rad * 3;

  s.startPose.pos.setXYZ(x, y, -0.5);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(rad/2, rad/2, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, -0.5);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(0, 0, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(1, 1, 1);
  s.endColor.setXYZ(0.2, 0.2, 0.2);

  this.screen.splasher.addCopy(s);

  s.duration *= 2;
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(0, 0, 1);

  s.startPose2.scale.setXYZ(0, 0, 1);
  s.endPose2.scale.setXYZ(0, 0, 1);

  this.screen.splasher.addCopy(s);
};

BulletSpirit.prototype.onTimeout = function(world, timeoutVal) {
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

