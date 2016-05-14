/**
 * @constructor
 * @extends {Spirit}
 */
function BulletSpirit(screen) {
  Spirit.call(this);
  this.screen = screen;

  this.type = BaseScreen.SpiritType.BULLET;
  this.id = -1;
  this.bodyId = -1;
  this.modelStamp = null;
  this.color = new Vec4();

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.trail = new Trail(4);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

  this.health = 1;
}
BulletSpirit.prototype = new Spirit();
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
  return RigidModel.createCircleMesh(3)
      .setColorRGB(1, 1, 1);
};

BulletSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BulletSpirit.prototype.onHitWall = function(mag) {
  var body = this.getBody();
  if (!body) return;
  mag = mag / body.mass;
  body.getPosAtTime(this.screen.now(), this.vec2d);
  this.screen.soundWallThump(this.vec2d, mag);
  if (0.1 * mag * this.health > 0.1 + Math.random()) {
    // dig
    var pillRad = 0.65;
    this.screen.drawTerrainPill(this.vec2d, this.vec2d, pillRad, 1);
    this.wallDamageSplash(this.vec2d, pillRad * 1.3);
    this.screen.soundBing(this.vec2d);
    this.destroyBody();
  } else {
    // bounce or vanish?
    this.health -= mag / 5;
    if (this.health <= 0) {
      // vanish
      this.destroyBody();
      this.wallDamageSplash(this.vec2d, body.rad * 1.5);
    } else {
      // bounce
      this.addTrailSegment();
    }
  }
};

BulletSpirit.prototype.onHitEnemy = function(mag) {
  var body = this.getBody();
  if (!body) return;
  body.getPosAtTime(this.screen.now(), this.vec2d);
  this.screen.soundWallThump(this.vec2d, mag);
  this.wallDamageSplash(this.vec2d, 3);
  this.destroyBody();
};

BulletSpirit.prototype.onHitOther = function(mag) {
  var body = this.getBody();
  if (!body) return;
  body.getPosAtTime(this.screen.now(), this.vec2d);
  // bounce or vanish?
  this.health -= mag / 5;
  if (this.health <= 0) {
    // vanish
    this.destroyBody();
  } else {
    // bounce
    this.addTrailSegment();
    this.wallDamageSplash(this.vec2d, body.rad);
  }
};

BulletSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (body) {
    var bodyPos = body.getPosAtTime(world.now, this.vec2d);
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.color);
    // Render the smaller ones in front.
    // TODO: standardize Z
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
  this.drawTrail();
};

BulletSpirit.prototype.addTrailSegment = function() {
  var now = this.screen.now();
  var body = this.getBody();
  this.rad = body.rad;
  var bodyPos = body.getPosAtTime(this.screen.now(), this.vec2d);
  this.trail.append(now, bodyPos, body.vel);
};

BulletSpirit.prototype.drawTrail = function() {
  var maxTime = this.now();
  var duration = 2;
  var minTime = maxTime - duration;
  var trailWarm = false;
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

      this.screen.renderer
          .setStamp(this.screen.soundStamp) // TODO cylinderStamp
          .setColorVector(this.color);

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
  s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.soundStamp);

  s.startTime = this.now();
  s.duration = 10;

  var x = pos.x;
  var y = pos.y;

  var endRad = rad * 2;

  s.startPose.pos.setXYZ(x, y, -0.5);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, -0.5);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(-rad, -rad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(1, 1, 1);
  s.endColor.setXYZ(0, 0, 0.5);

  this.screen.splasher.addCopy(s);
};



BulletSpirit.prototype.onTimeout = function(world, timeout) {
  this.destroyBody();
};

BulletSpirit.prototype.destroyBody = function() {
  if (this.bodyId) {
    this.trail.endTime = this.now();
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;
  }
};

BulletSpirit.prototype.getBody = function() {
  return this.screen.getBodyById(this.bodyId);
};

BulletSpirit.prototype.now = function() {
  return this.screen.now();
};

BulletSpirit.prototype.toJSON = function() {
  return BulletSpirit.getJsoner().toJSON(this);
};

BulletSpirit.prototype.setFromJSON = function(json) {
  BulletSpirit.getJsoner().setFromJSON(json, this);
};

