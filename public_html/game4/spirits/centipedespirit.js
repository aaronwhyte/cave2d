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

  // Between 0 and 1.
  // When it hits 1, a centipede will break apart to get unstuck.
  this.stress = 0;
  this.joinableAfterTime = 0;

  this.lastControlTime = this.now();
  this.viewportsFromCamera = 0;

  this.healthFraction = 1;

  this.headwardId = 0;
  this.tailwardId = 0;
}
CentipedeSpirit.prototype = new BaseSpirit();
CentipedeSpirit.prototype.constructor = CentipedeSpirit;

CentipedeSpirit.MEASURE_TIMEOUT = 2.1;
CentipedeSpirit.REJOIN_TIMEOUT = 50;
CentipedeSpirit.THRUST = 0.8;
CentipedeSpirit.TRACTION = 0.5;
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
  6: "lastControlTime",
  7: "headwardId",
  8: "tailwardId",
  9: "joinableAfterTime"
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
  b.grip = 0.3;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 1.2;
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

/**
 * Finds the head, and then reverses the entire chain so the tail is the new head.
 */
CentipedeSpirit.prototype.reverseChain = function() {
  var scan = this.getHeadmostSpirit();
  var next;
  while (scan) {
    next = scan.getTailwardSpirit();
    var temp = scan.headwardId;
    scan.headwardId = scan.tailwardId;
    scan.tailwardId = temp;
    scan = next;
  }
  return this;
};

CentipedeSpirit.prototype.getHeadmostSpirit = function() {
  // find the head
  var head = this;
  var scan = head;
  while (scan = head.getHeadwardSpirit()) {
    head = scan;
  }
  return head;
};

CentipedeSpirit.prototype.findMipointSpirit = function() {
  var node = this;
  var halfNode = this;
  var halfStep = false;
  var nextNode;
  while (nextNode = node.getTailwardSpirit()) {
    node = nextNode;
    if (halfStep) {
      halfNode = halfNode.getTailwardSpirit();
      halfStep = false;
    } else {
      halfStep = true;
    }
  }
  return halfNode;
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
  } else {
    body.applyAngularFrictionAtTime(friction * time, now);
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
  var thisBody = this.getBody();
  var now = this.now();
  var traction = CentipedeSpirit.TRACTION;
  this.stress = 0;

  // Follow the headward spirit.
  var thatBody = headward.getBody();
  var thisPos = this.getBodyPos();
  var thatPos = thatBody.getPosAtTime(this.now(), Vec2d.alloc());

  var dist = thatPos.distance(thisPos);
  if (dist > thisBody.rad * 5) {
    // break!
    this.getHeadwardSpirit().breakOffTail();
  } else {
    // linear accel
    var p0 = dist - thisBody.rad * 1.05 - thatBody.rad;
    var deltaPos = Vec2d.alloc().set(thatPos).subtract(thisPos);
    var deltaVel = Vec2d.alloc().set(thatBody.vel).subtract(thisBody.vel);
    var v0 = deltaVel.dot(deltaPos.scaleToLength(1));
    var maxA = CentipedeSpirit.THRUST * 2;
    var accelMag = -Spring.getLandingAccel(p0, v0, maxA, CentipedeSpirit.MEASURE_TIMEOUT * 1.5);
    this.accel.setXY(0, 1).rot(this.getBodyAngPos()).scaleToLength(1).scale(accelMag);
    newVel.scale(1 - traction).add(this.accel.scale(traction));
    deltaPos.free();
    deltaVel.free();

    // angular accel
    var destAngle = this.getAngleToBody(thatBody);
    thisBody.applyAngularFrictionAtTime(0.5, now);
    var angAccel = this.getAngleDiff(destAngle) * 0.3;
    thisBody.addAngVelAtTime(angAccel, now);
  }
  thatPos.free();
};

CentipedeSpirit.prototype.handleLeader = function(newVel, time) {
  this.handleFront(newVel, time, true);
};

CentipedeSpirit.prototype.handleLoner = function(newVel, time) {
  this.handleFront(newVel, time, false);
};

CentipedeSpirit.prototype.getHeadId = function() {
  var node = this;
  var nextNode = null;
  while (nextNode = node.getHeadwardSpirit()) {
    node = nextNode;
  }
  return node.id;
};

CentipedeSpirit.prototype.handleFront = function(newVel, time, hasTail) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var now = this.now();
  var traction = CentipedeSpirit.TRACTION;
  var scanDist = 2.5 * body.rad;
  var distFrac, scanRot;
  var moreStress = 0.04;

  var bestFrac = 0; // lowest possible value
  var bestRot = 0;

  var maxIterations = 8;
  if (this.stress >= 1 && !this.tailwardId && Math.random() > 0.1) {
    // This stressed-out loner doesn't get any extra scan cycles
    maxIterations = 0;
    // freak out a little instead
    body.addAngVelAtTime(0.2 * (Math.random() - 0.5), now);
  }
  // How far (to either side) to look for a way out.
  var maxScanRotation = Math.PI * 0.9;

  // Randomly pick a starting side for every pair of side-scans.
  var lastSign = Math.sign(Math.random() - 0.5);
  for (var i = 0; i <= maxIterations; i++) {
    if (i === 0) {
      distFrac = this.scan(pos, 0, scanDist, body.rad);
      if (distFrac < 0) {
        bestFrac = 1;
      } else {
        // hit something
        bestFrac = distFrac;
        this.maybeJoin();
      }
    } else {
      // Do a pair of scans to either side, in random order
      for (var signMult = -1; signMult <= 1; signMult += 2) {
        scanRot = signMult * lastSign * maxScanRotation * i / maxIterations;
        distFrac = this.scan(pos, scanRot, scanDist, body.rad);
        if (distFrac < 0) {
          bestFrac = 1;
          bestRot = scanRot;
        } else {
          // hit something
          this.maybeJoin();
          if (distFrac > bestFrac) {
            // This is the longest scan so far. Remember it!
            bestFrac = distFrac;
            bestRot = scanRot;
          }
          // keep looking...
        }
      }
    }
    if (bestFrac === 1) {
      // A clear path is definitely the best path.
      break;
    }
  }
  // turn
  body.applyAngularFrictionAtTime(0.5, now);
  var angAccel = Math.clip(bestRot * bestFrac * (1 - this.stress) * 0.3, -0.2, 0.2);
  body.addAngVelAtTime(angAccel, now);
  if (!this.stress) {
    body.addAngVelAtTime(0.1 * (Math.random() - 0.5), now);
  }

  // and push
  var thrust = CentipedeSpirit.THRUST * (0.5 * (1 - this.stress) + 0.5 * bestFrac);
  var dir = this.getBodyAngPos();
  this.accel
      .set(body.vel).scale(-traction * time)
      .addXY(
          Math.sin(dir) * thrust * traction * time,
          Math.cos(dir) * thrust * traction * time);
  newVel.scale(1 - traction).add(this.accel.scale(traction));

  if (bestFrac === 1) {
    // relax!
    this.stress = Math.max(0, this.stress - moreStress);
  } else {
    // get stressed?
    var joinable = this.joinableAfterTime < this.now();
    // less stress if unjoinable
    this.stress = Math.min(1, this.stress + moreStress * (joinable ? 1 : 0.2));
  }
  if (hasTail && this.stress >= 1) {
    var mid = this.findMipointSpirit();
    var midHead = mid.breakOffTail().reverseChain().getHeadmostSpirit();
    midHead.stress = 0;
    midHead.joinableAfterTime = this.now() + CentipedeSpirit.REJOIN_TIMEOUT;
    var thisHead = this.reverseChain().getHeadmostSpirit();
    thisHead.stress = 0;
    thisHead.joinableAfterTime = this.now() + CentipedeSpirit.REJOIN_TIMEOUT;
  }
};

CentipedeSpirit.prototype.breakOffTail = function() {
  var tailwardSpirit = this.getTailwardSpirit();
  if (tailwardSpirit) {
    tailwardSpirit.headwardId = 0;
    tailwardSpirit.stress = 1;
    this.tailwardId = 0;
  }
  return tailwardSpirit;
};

CentipedeSpirit.prototype.maybeJoin = function() {
  if (!this.stress && !this.headwardId && this.now() > this.joinableAfterTime) {
    var otherSpirit = this.getScanHitSpirit();
    if (otherSpirit &&
        otherSpirit.type === Game4BaseScreen.SpiritType.CENTIPEDE &&
        !otherSpirit.getTailwardSpirit() &&
        !otherSpirit.stress &&
        this.now() > otherSpirit.joinableAfterTime &&
        otherSpirit.getHeadId() !== this.id) {
      // Found a relaxed segment with out a tail. Join up!
      this.headwardId = otherSpirit.id;
      otherSpirit.tailwardId = this.id;
    }
  }
};

CentipedeSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (!CentipedeSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));//.scale1(!this.headwardId ? 3 : 0.7));
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
