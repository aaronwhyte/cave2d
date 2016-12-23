/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
//  this.trailColor = new Vec4().setRGBA(0.8, 0.2, 0.6, 1);
//  this.trailColor2 = new Vec4().setRGBA(1, 0.3, 0.7, 1);
  this.trailColor = new Vec4().setRGBA(0.8, 0, 0, 1);
  this.trailColor2 = new Vec4().setRGBA(1, 0.3, 0.2, 1);

  this.vec2d = new Vec2d();
  this.accel = new Vec2d();
  this.newVel = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  // trail stuff
  this.trail = new Trail(200);
  this.segStartVec = new Vec2d();
  this.segEndVec = new Vec2d();

}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.TRACKBALL_ACCEL = 0.1;//0.5;
PlayerSpirit.TRACKBALL_TRACTION = 0.3;
PlayerSpirit.TRACKBALL_MAX_ACCEL = 5;

PlayerSpirit.FRICTION = 0.01;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.GRAVITY = 0.12;
PlayerSpirit.MAX_VEL = 4.5;
PlayerSpirit.RAD = 3;
PlayerSpirit.MAX_ANG_VEL = PlayerSpirit.MAX_VEL / PlayerSpirit.RAD;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

PlayerSpirit.getJsoner = function() {
  if (!PlayerSpirit.jsoner) {
    PlayerSpirit.jsoner = new Jsoner(PlayerSpirit.SCHEMA);
  }
  return PlayerSpirit.jsoner;
};

PlayerSpirit.prototype.toJSON = function() {
  return PlayerSpirit.getJsoner().toJSON(this);
};

PlayerSpirit.prototype.setFromJSON = function(json) {
  PlayerSpirit.getJsoner().setFromJSON(json, this);
};

PlayerSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

PlayerSpirit.prototype.setTrackball = function(trackball) {
  this.trackball = trackball;
};

PlayerSpirit.createModel = function() {
  var model =  RigidModel.createCircle(37)
      .setColorRGB(0.6, 0.6, 0.6);
  for (var i = 0, m = 4; i < m; i++) {
    model.addRigidModel(RigidModel.createCircle(24)
        .transformPositions(new Matrix44().toScaleOpXYZ(0.2, 0.2, 1))
        .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0.5, -0.25))
        .transformPositions(new Matrix44().toRotateZOp(2 * Math.PI * i / m))
        .setColorRGB(0.3, 0.3, 0.3));
  }
//      .addRigidModel(RigidModel.createCircle(24)
//          .transformPositions(new Matrix44().toScaleOpXYZ(0.3, 0.3, 1))
//          .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.5, -0.25))
//          .setColorRGB(0.2, 0.2, 0));
//      .addRigidModel(RigidModel.createCircle(12)
//          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
//          .transformPositions(new Matrix44().toTranslateOpXYZ(0.32, 0.23, -0.25))
//          .setColorRGB(0, 0, 0))
//      .addRigidModel(RigidModel.createSquare()
//          .transformPositions(new Matrix44().toScaleOpXYZ(0.25, 0.25, 1))
//          .transformPositions(new Matrix44().toTranslateOpXYZ(0.5, 0, -0.25))
//          .setColorRGB(0.8, 0.8, 0.8))
//  .addRigidModel(RigidModel.createSquare()
//      .transformPositions(new Matrix44().toScaleOpXYZ(0.25, 0.25, 1))
//      .transformPositions(new Matrix44().toTranslateOpXYZ(-0.5, 0, -0.25))
//      .setColorRGB(0.4, 0.4, 0.4));
  return model;
};

PlayerSpirit.factory = function(playScreen, stamp, pos, dir) {
  var world = playScreen.world;

  var spirit = new PlayerSpirit(playScreen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);

  var spiritId = world.addSpirit(spirit);
  var b = spirit.createBody(pos, dir);
  spirit.bodyId = world.addBody(b);

  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

PlayerSpirit.prototype.createBody = function(pos, dir) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.now());
  b.rad = PlayerSpirit.RAD;
  b.hitGroup = BaseScreen.Group.PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.turnable = true;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.grip = 0.8;
  b.elasticity = 0.2;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

/**
 *
 * @param {number} tx trackball x movement since last time
 * @param {number} ty trackball y movement since last time
 * @param {boolean} tt whether the trackball is touched (works good for touchscreens, otherwise meh
 * @param {number} tContrib bitflags indicating whether key, touch, or mouse were contributors to the trackball
 * @param {boolean} b1 button one down?
 * @param {boolean} b2 button two down?
 */
PlayerSpirit.prototype.handleInput = function(tx, ty, tt, tContrib, b1, b2) {
  var now = this.now();
  var time = now - this.lastInputTime;
  this.lastInputTime = now;

  if (tt) {
    var body = this.getBody();
    if (body) {
      var newAngVel = this.getBodyAngVel();
      var angAccel = 0;
//      angAccel = newAngVel * (-PlayerSpirit.TRACKBALL_TRACTION);
//      newAngVel += angAccel * time / this.screen.timeMultiplier;
//
      angAccel = tx * PlayerSpirit.TRACKBALL_ACCEL;// * PlayerSpirit.TRACKBALL_TRACTION;
      if (angAccel < -PlayerSpirit.TRACKBALL_MAX_ACCEL) angAccel = -PlayerSpirit.TRACKBALL_MAX_ACCEL;
      if (angAccel > PlayerSpirit.TRACKBALL_MAX_ACCEL) angAccel = PlayerSpirit.TRACKBALL_MAX_ACCEL;
      newAngVel += angAccel * time / this.screen.timeMultiplier;
      newAngVel *= 0.99;
      newAngVel = Math.max(-PlayerSpirit.MAX_ANG_VEL, Math.min(newAngVel, PlayerSpirit.MAX_ANG_VEL));
      this.setBodyAngVel(newAngVel);
    }
  }
  this.addTrailSegment();
};

PlayerSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var now = this.now();
  if (timeoutVal == PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal == -1) {
    var time = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.getBody();
    if (body) {
      this.newVel.set(body.vel);
      this.newVel.y -= PlayerSpirit.GRAVITY;
      this.accel.set(this.newVel).scale(-PlayerSpirit.FRICTION);
      this.newVel.add(this.accel.scale(time));

      // Reset the body's pathDurationMax because it gets changed at compile-time,
      // but it is serialized at level-save-time, so old saved values might not
      // match the new compiled-in values. Hm.
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
      body.setVelAtTime(this.newVel, now);
      body.invalidatePath();
    }
    // TODO: put addTimeout in screen, remove world access
    world.addTimeout(now + PlayerSpirit.FRICTION_TIMEOUT, this.id, PlayerSpirit.FRICTION_TIMEOUT_ID);
    this.addTrailSegment();
  } else if (timeoutVal == PlayerSpirit.RESPAWN_TIMEOUT_ID) {
    this.respawn();
  }
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  // TODO: replace world access with screen API?
  var body = this.getBody();
  if (body) {
    var bodyPos = this.getBodyPos();
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
  this.drawTrail();
};

PlayerSpirit.prototype.onHitWall = function(mag, pos) {
  var body = this.getBody();
  if (!body) return;
  this.addTrailSegment();
};

PlayerSpirit.prototype.addTrailSegment = function() {
  var now = this.screen.now();
  var body = this.getBody();
  this.rad = body.rad * (1.1 + Math.random() * 0.1);
  this.trail.append(now, this.getBodyPos(), body.vel);
};

PlayerSpirit.prototype.drawTrail = function() {
  var maxTime = this.now();
  var duration = 6;
  var minTime = maxTime - duration;
  var trailWarm = false;
  this.screen.renderer
      .setStamp(this.stamps.cylinderStamp)
      .setColorVector(this.trailColor);
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

      var startRad = Math.min(this.rad, 1.1 * this.rad * (drawStartTime - minTime) / (maxTime - minTime));
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0.2))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));
      this.screen.renderer.setModelMatrix(this.modelMatrix);

      var endRad = Math.min(this.rad, 1.1 * this.rad * (drawEndTime - minTime) / (maxTime - minTime));
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segEndVec.x, this.segEndVec.y, 0.2))
          .multiply(this.mat44.toScaleOpXYZ(endRad, endRad, 1));
      this.screen.renderer.setModelMatrix2(this.modelMatrix);
      this.screen.renderer.drawStamp();
    }
  }
  var maxTime = this.now();
  var duration = 3;
  var minTime = maxTime - duration;
  var trailWarm = false;
  this.screen.renderer
      .setStamp(this.stamps.cylinderStamp)
      .setColorVector(this.trailColor2);
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

      var startRad = 1 * this.rad * (drawStartTime - minTime) / (maxTime - minTime);
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segStartVec.x, this.segStartVec.y, 0.1))
          .multiply(this.mat44.toScaleOpXYZ(startRad, startRad, 1));
      this.screen.renderer.setModelMatrix(this.modelMatrix);

      var endRad = 1 * this.rad * (drawEndTime - minTime) / (maxTime - minTime);
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(this.segEndVec.x, this.segEndVec.y, 0.1))
          .multiply(this.mat44.toScaleOpXYZ(endRad, endRad, 1));
      this.screen.renderer.setModelMatrix2(this.modelMatrix);
      this.screen.renderer.drawStamp();
    }
  }
};
