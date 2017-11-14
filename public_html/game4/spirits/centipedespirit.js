/**
 * Both head and body
 * @constructor
 * @extends {BaseSpirit}
 */
function CentipedeSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.CENTIPEDE;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vecToPlayer = new Vec2d();
  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.accel = new Vec2d();
  this.stress = 0;

  this.lastControlTime = this.now();
  this.viewportsFromCamera = 0;

  this.healthFraction = 1;

  this.headwardId = 0;
  this.tailwardId = 0;
}
CentipedeSpirit.prototype = new BaseSpirit();
CentipedeSpirit.prototype.constructor = CentipedeSpirit;

CentipedeSpirit.MEASURE_TIMEOUT = 0.9;
CentipedeSpirit.THRUST = 0.5;
CentipedeSpirit.TRACTION = 0.25;
CentipedeSpirit.MAX_TIMEOUT = 10;
CentipedeSpirit.LOW_POWER_VIEWPORTS_AWAY = 2;
CentipedeSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
CentipedeSpirit.STOPPING_ANGVEL = 0.01;
CentipedeSpirit.MAX_HEALTH = 3;
CentipedeSpirit.OPTIMIZE = true;

CentipedeSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "stress",
  5: "health",
  6: "lastControlTime"
};

CentipedeSpirit.getJsoner = function() {
  if (!CentipedeSpirit.jsoner) {
    CentipedeSpirit.jsoner = new Jsoner(CentipedeSpirit.SCHEMA);
  }
  return CentipedeSpirit.jsoner;
};

CentipedeSpirit.prototype.toJSON = function() {
  return CentipedeSpirit.getJsoner().toJSON(this);
};

CentipedeSpirit.prototype.setFromJSON = function(json) {
  CentipedeSpirit.getJsoner().setFromJSON(json, this);
};

CentipedeSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

CentipedeSpirit.createModel = function() {
  return RigidModel.createCircle(8)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
      .setColorRGB(1, 0.1, 0.1);
};

CentipedeSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new CentipedeSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.9;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 1;
  b.hitGroup = screen.getHitGroups().ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

CentipedeSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

CentipedeSpirit.prototype.scan = function(pos, rot, dist, rad) {
  var angle = this.getBodyAngPos() + rot;
  return this.screen.scan(
      this.screen.getHitGroups().ENEMY_SCAN,
      pos,
      this.scanVec.setXY(
          Math.sin(angle) * dist,
          Math.cos(angle) * dist),
      rad,
      this.scanResp);
};

CentipedeSpirit.prototype.getHeadwardSpirit = function() {
  var headward = null;
  if (this.headwardId) {
    headward = this.screen.getSpiritById(this.headwardId);
    if (!headward) {
      this.headwardId = 0;
    }
  }
  return headward;
};

CentipedeSpirit.prototype.getTailwardSpirit = function() {
  var tailward = null;
  if (this.tailwardId) {
    tailward = this.screen.getSpiritById(this.tailwardId);
    if (!tailward) {
      this.tailwardId = 0;
    }
  }
  return tailward;
};

CentipedeSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.stress = this.stress || 0;

  var friction = this.getFriction();

  var now = this.now();
  var time = Math.max(0, Math.min(CentipedeSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);

  var newVel = this.vec2d.set(body.vel);

  var oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < CentipedeSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  var oldVelMagSq = newVel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < CentipedeSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  var headward = this.getHeadwardSpirit();
  var tailward = this.getTailwardSpirit();
  if (this.screen.isPlaying()) {
    if (!CentipedeSpirit.OPTIMIZE || this.viewportsFromCamera < CentipedeSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      if (headward) {
        // this is following somebody
        this.handleFollower(newVel, time, headward);
      } else if (tailward) {
        // this is the leader
        this.handleLeader(newVel, time);
      } else {
        // no head or tail. Consider joining a chain
        this.handleLoner(newVel, time);
      }
    }
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  timeoutDuration = Math.min(
      CentipedeSpirit.MAX_TIMEOUT,
      CentipedeSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

CentipedeSpirit.prototype.handleFollower = function(newVel, time, headward) {
  var body = this.getBody();
  var now = this.now();
  var traction = CentipedeSpirit.TRACTION;
  this.stress = 0;

  // Follow the headward spirit.
  // TODO: break off if separated
  var headwardBody = headward.getBody();
  var destAngle = this.getAngleToBody(headwardBody);
  var angAccel = this.getAngleDiff(destAngle) * 0.5;
  var thisPos = this.getBodyPos();
  var thatPos = headwardBody.getPosAtTime(this.now(), Vec2d.alloc());

  var dist = thatPos.distance(thisPos) - body.rad - headwardBody.rad;
  var targetDist = body.rad;
  if (dist > targetDist * 6) {
    // break!
    this.getHeadwardSpirit().tailwardId = 0;
    this.headwardId = 0;

  } else {
    var thrust = 1.3 * CentipedeSpirit.THRUST * Math.min(targetDist, dist - targetDist) / targetDist;
    body.addAngVelAtTime(angAccel, now);
    body.applyAngularFrictionAtTime(0.4, now);

    var dir = this.getBodyAngPos();

    this.accel
        .set(body.vel).scale(-traction * time)
        .addXY(
            Math.sin(dir) * thrust * traction * time,
            Math.cos(dir) * thrust * traction * time);
    newVel.add(this.accel);
  }
  thatPos.free();
};

CentipedeSpirit.prototype.handleLeader = function(newVel, time) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var now = this.now();
  var traction = CentipedeSpirit.TRACTION;

  // Run forward and avoid obstacles
  var antennaRotMag = Math.max(Math.PI * 0.15, Math.PI * this.stress);
  var thrust = CentipedeSpirit.THRUST;
  var scanDist = 3 * (2 - this.stress) * CentipedeSpirit.THRUST;
  var scanRot = 2 * antennaRotMag * (Math.random() - 0.5) + this.getBodyAngVel();
  var distFrac = this.scan(pos, scanRot, scanDist, body.rad);
  var closeness = 1 - distFrac;
  var angAccel = 0;
  if (distFrac >= 0) {
    // rayscan hit
    var otherSpirit = this.getScanHitSpirit();
    // avoid obstruction
    angAccel = -scanRot * (0.2 * this.stress + 1) * closeness;
    this.stress += 0.06 * closeness;
    thrust *= distFrac * distFrac;
  } else {
    // clear path
    // turn towards the scan
    angAccel = 0.2 * scanRot;
    this.stress = 0;
  }
  this.stress = Math.min(1, Math.max(0, this.stress));
  if (this.stress === 1) {
    // break the chain!
    this.getTailwardSpirit().headwardId = 0;
    this.tailwardId = 0;
  }

  body.addAngVelAtTime(angAccel, now);
  body.applyAngularFrictionAtTime(0.4, now);

  var dir = this.getBodyAngPos();

  this.accel
      .set(body.vel).scale(-traction * time)
      .addXY(
          Math.sin(dir) * thrust * traction * time,
          Math.cos(dir) * thrust * traction * time);
  newVel.add(this.accel);
};

CentipedeSpirit.prototype.handleLoner = function(newVel, time) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var now = this.now();
  var traction = CentipedeSpirit.TRACTION;

  // Run around looking for someone to follow.
  var antennaRotMag = Math.max(Math.PI * 0.15, Math.PI * this.stress);
  var thrust = 1.5 * CentipedeSpirit.THRUST;
  var scanDist = 3 * (2 - this.stress) * CentipedeSpirit.THRUST;
  var scanRot = 2 * antennaRotMag * (Math.random() - 0.5) + this.getBodyAngVel();
  var distFrac = this.scan(pos, scanRot, scanDist, body.rad);
  var closeness = 1 - distFrac;
  var angAccel = 0;
  if (distFrac >= 0) {
    // rayscan hit
    var otherSpirit = this.getScanHitSpirit();
    if (this.stress === 0 &&
        otherSpirit &&
        otherSpirit.type === Game4BaseScreen.SpiritType.CENTIPEDE &&
        !otherSpirit.getTailwardSpirit() &&
        !otherSpirit.stress) {
      // Found a relaxed segment with out a tail. Try to join up!
      this.stress = 0;
      angAccel = 0.4 * scanRot;
      thrust *= 1.5;
      this.headwardId = otherSpirit.id;
      otherSpirit.tailwardId = this.id;
    } else {
      // avoid obstruction
      angAccel = -scanRot * (0.5 * this.stress + 1) * closeness;
      this.stress += 0.06 * closeness;
      thrust *= distFrac * distFrac;
    }
  } else {
    // clear path
    // turn towards the scan
    angAccel = 0.2 * scanRot;
    this.stress = 0;
  }
  this.stress = Math.min(1, Math.max(0, this.stress));

  body.addAngVelAtTime(angAccel, now);
  body.applyAngularFrictionAtTime(0.4, now);

  var dir = this.getBodyAngPos();

  this.accel
      .set(body.vel).scale(-traction * time)
      .addXY(
          Math.sin(dir) * thrust * traction * time,
          Math.cos(dir) * thrust * traction * time);
  newVel.add(this.accel);
};

CentipedeSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (!CentipedeSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

CentipedeSpirit.prototype.onPlayerBulletHit = function(damage) {
  var rad = this.getBody().rad;
  this.healthFraction -= damage / (CentipedeSpirit.MAX_HEALTH * rad * rad * rad);
  if (this.healthFraction <= 0) {
    this.explode();
  }
};

CentipedeSpirit.prototype.explode = function() {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var craterRad = body.rad * 3;
  this.explosionSplash(pos, craterRad);
  var bulletRad = body.rad / 2;
  this.bulletBurst(pos, bulletRad, body.rad - bulletRad, craterRad * 1.75);
  this.screen.drawTerrainPill(pos, pos, body.rad * 0.7, 0);
  this.screen.sounds.antExplode(pos);

  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

CentipedeSpirit.prototype.bulletBurst = function(pos, bulletRad, startRad, endRad) {
  var p = Vec2d.alloc();
  var v = Vec2d.alloc();
  var bulletCount = Math.floor(3 + bulletRad*5);
  var a = Math.random() * Math.PI;
  for (var i = 0; i < bulletCount; i++) {
    var duration = (6 + 2 * Math.random());
    var speed = (endRad - startRad) / duration;
    a += 2 * Math.PI / bulletCount;
    v.setXY(0, 1).rot(a + Math.random() * Math.PI * 0.15);
    p.set(v).scale(startRad).add(pos);
    v.scale(speed);
    this.addTractorBullet(p, v, bulletRad, duration);
  }
  v.free();
  p.free();
};

CentipedeSpirit.prototype.explosionSplash = function(pos, rad) {
  // TODO: Once ants start exploding again, move this up to Splashes
  var now = this.now();
  // cloud particles
  var s = this.screen.splash;
  var x = pos.x;
  var y = pos.y;
  var self = this;
  var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, sizeFactor) {
    s.reset(Game4BaseScreen.SplashType.WALL_DAMAGE, self.stamps.circleStamp);
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -0.9);
    s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 0.9);
    var startRad = sizeFactor * rad;
    s.startPose.scale.setXYZ(startRad, startRad, 1);
    s.endPose.scale.setXYZ(0, 0, 1);
    s.startColor.setXYZ(0, 1, 0); // ant-ish color
    s.endColor.setXYZ(0, 0.4, 0);
    // s.endColor.setXYZ(0.2, 0.3, 0.6); // wall color
    self.screen.splasher.addCopy(s);
  }

  particles = Math.ceil(5 * (1 + 0.5 * Math.random()));
  explosionRad = rad/2;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 10 * Math.random() + 6;
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random()/4;
    dx = 2 * Math.sin(dir) * explosionRad / duration;
    dy = 2 * Math.cos(dir) * explosionRad / duration;
    addSplash(x, y, dx, dy, duration, 0.3 + Math.random() * 0.1);
  }
};
