/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Test44BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();

  this.camera = new Camera(0.1, 0.4, 7);
  this.circle = new Circle();

  this.aim = new Vec2d();
  this.destAim = new Vec2d();
  this.slowAimSpeed = 0;

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.targetBodyId = null;
  // relative to the target body, where did the player grab?
  this.targetRelPos = new Vec2d();
  // What was the direction of the beam relative to the target when it struck?
  this.targetBeamDir = new Vec2d();
  this.gripWorldPos = new Vec2d();

  this.accel = new Vec2d();
  this.slot = null;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 1;

PlayerSpirit.SPEED = 1.5;
PlayerSpirit.TRACTION = 0.4;
PlayerSpirit.FRICTION = 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 0.2;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;
PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

// dist from player surface, not from player center
PlayerSpirit.TRACTOR_HOLD_DIST = PlayerSpirit.PLAYER_RAD * 2;
PlayerSpirit.SEEKSCAN_DIST = PlayerSpirit.TRACTOR_HOLD_DIST * 3;
PlayerSpirit.SEEKSCAN_RAD = 0.1;
// PlayerSpirit.TRACTOR_BREAK_DIST = 3 + PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.SEEKSCAN_RAD;
PlayerSpirit.TRACTOR_BREAK_DIST = PlayerSpirit.SEEKSCAN_DIST;

PlayerSpirit.TRACTOR_HOLD_FORCE = 3;


PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "lastFrictionTime",
  5: "aim"
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
  return this;
};

/**
 * @param {ModelStamp} modelStamp
 * @returns {PlayerSpirit}
 */
PlayerSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
  return this;
};

/**
 * @param {PlayerSlot} slot
 * @returns {PlayerSpirit}
 */
PlayerSpirit.prototype.setSlot = function(slot) {
  this.slot = slot;
  return this;
};

PlayerSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
  return this;
};

PlayerSpirit.createModel = function() {
  return RigidModel.createCircle(24)
      .setColorRGB(1, 1, 1)
      .addRigidModel(RigidModel.createCircle(12)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(-0.32, 0.23, -0.25))
          .setColorRGB(0, 0, 0))
      .addRigidModel(RigidModel.createCircle(12)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0.32, 0.23, -0.25))
          .setColorRGB(0, 0, 0))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.07, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.37, -0.25))
          .setColorRGB(0, 0, 0));
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
  b.rad = PlayerSpirit.PLAYER_RAD;
  b.hitGroup = this.screen.getHitGroups().PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.grip = 0.5;
  b.elasticity = 0.7;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.handleInput = function() {
  if (!this.slot) return;
  var state = this.slot.stateName;
  if (state != ControlState.PLAYING) return;

  var body = this.getBody();
  if (!body) return;

  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }

  var now = this.now();
  var duration = now - this.lastInputTime;
  this.lastInputTime = now;

  var controls = this.slot.getControlList();
  var stick = controls.get(ControlName.STICK);
  var touchlike = stick.isTouchlike();

  ////////////
  // BUTTONS
  var b1 = controls.get(ControlName.BUTTON_1);
  var b2 = controls.get(ControlName.BUTTON_2);
  if (b1.getVal()) {
    if (this.getTargetBody()) {
      this.releaseTarget();
    }
  }
  if (b2.getVal()) {
    if (!this.getTargetBody()) {
      this.tractorBeamScan();
    }
  }

  var aimLocked = false;//b1.getVal() || b2.getVal();
  var preciseKeyboard = !touchlike && !stick.isSpeedTriggerDown() && !aimLocked;
  stick.getVal(this.vec2d);
  var stickMag = this.vec2d.magnitude();

  ////////////
  // MOVEMENT
  var speed = PlayerSpirit.SPEED;
  var traction = PlayerSpirit.TRACTION;

  if (stick.isTouched()) {
    if (preciseKeyboard && stickMag) {
      // When in keyboard precise-aiming mode, accelerate less
      // when the stick and the aim point in different directions.
      traction *= Math.max(0, this.vec2d.dot(this.aim)) / stickMag;
    }
    // traction slowdown
    this.accel.set(body.vel).scale(-traction);

    this.vec2d.scale(speed * traction).clipToMaxLength(speed * traction);
    this.accel.add(this.vec2d);
    body.addVelAtTime(this.accel, this.now());
  }

  ////////
  // AIM
  var stickDotAim = stick.getVal(this.vec2d).scaleToLength(1).dot(this.aim);
  var reverseness = Math.max(0, -stickDotAim);
  if (aimLocked) {
    // lock destAim at whatever it was going into aimlock, so aim doesn't change when coming out of aimlock.
    this.destAim.set(this.aim);
  } else {
    if (touchlike) {
      this.handleTouchlikeAim(stick, stickMag, reverseness);
    } else {
      this.handleKeyboardAim(stick, stickMag, reverseness, preciseKeyboard, aimLocked);
    }
  }

  //////////////////
  // STICK SCALING
  if (touchlike && stickMag) {
    var unshrinkingMag = 0.9;
    if (stickMag < unshrinkingMag) {
      var stickScale = 0.93 + 0.07 * stickMag / unshrinkingMag;
      stick.scale(stickScale);
    }
  }
};

PlayerSpirit.prototype.releaseTarget = function() {
  this.targetBodyId = 0;
};


PlayerSpirit.prototype.handleTouchlikeAim = function(stick, stickMag, reverseness) {
  // touch or pointer-lock
    if (stickMag && stick.isTouched()) {
      // Any stick vector more than 90 degrees away from the aim vector is somewhat reverse:
      // 0 for 90 degreees, 1 for 180 degrees.
      // The more reverse the stick is, the less the old aim's contribution to the new aim.
      // That makes it easier to flip the aim nearly 180 degrees quickly.
      // Without that, the player ends up facing gliding backwards instead of aiming.
      this.destAim.scale(0.5 * (1 - reverseness * 0.9)).add(stick.getVal(this.vec2d).scale(Math.min(1.5, 1 + 1 * stickMag)));
      this.destAim.scaleToLength(1);
      var dist = stick.getVal(this.vec2d).distance(this.destAim);
      this.aim.slideByFraction(this.destAim, Math.min(1, dist * 2));
    }
    this.aim.slideByFraction(this.destAim, 0.5);
};


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness, preciseKeyboard, aimLocked) {
  // up/down/left/right buttons
  var slowAimFriction = 0.05;
  if (stickMag) {
    if (preciseKeyboard) {
      var correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
      dist = correction.magnitude();
      this.slowAimSpeed += 0.01 * dist;
      slowAimFriction = 0.01;
      this.destAim.add(correction.scale(Math.min(1, this.slowAimSpeed)));
    } else {
      // fast imprecise corrections
      stick.getVal(this.destAim);
      slowAimFriction = 1;
    }
  }
  this.slowAimSpeed *= (1 - slowAimFriction);
  this.destAim.scaleToLength(1);
  if (!aimLocked && reverseness > 0.99) {
    // 180 degree flip, precise or not, so set it instantly.
    this.destAim.set(stick.getVal(this.vec2d)).scaleToLength(1);
    this.aim.set(this.destAim);
  } else {
    var dist = this.aim.distance(this.destAim);
    var distContrib = dist * 0.25;
    var smoothContrib = 0.1 / (dist + 0.1);
    this.aim.slideByFraction(this.destAim, Math.min(1, smoothContrib + distContrib));
    this.aim.scaleToLength(1);
  }
};


PlayerSpirit.prototype.tractorBeamScan = function() {
  var scanPos = this.getBodyPos();
  var scanVel = this.vec2d.set(this.aim).scaleToLength(
      PlayerSpirit.PLAYER_RAD + PlayerSpirit.SEEKSCAN_DIST - PlayerSpirit.SEEKSCAN_RAD);
  var resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
  if (resultFraction == -1) {
    // no hit
    this.screen.addScanSplash(scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD, resultFraction);
  } else {
    // grab that thing!
    var targetBody = this.screen.world.getBodyByPathId(this.scanResp.pathId);
    if (targetBody) {
      var now = this.now();
      this.targetBodyId = targetBody.id;
      var contactPos = Vec2d.alloc().set(scanVel).scale(resultFraction).add(scanPos);
      var targetPos = targetBody.getPosAtTime(now, Vec2d.alloc());
      this.targetRelPos.set(contactPos).subtract(targetPos).rot(-targetBody.getAngPosAtTime(now));
      this.targetBeamDir.set(scanVel).scaleToLength(1).rot(-targetBody.getAngPosAtTime(now));
      targetPos.free();
      contactPos.free();
    }
  }
};

PlayerSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var now = this.now();
  if (timeoutVal == PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal == -1) {
    var duration = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.getBody();
    if (body) {
      // tractor beam force?
      var targetBody = this.getTargetBody();
      if (targetBody) {
        var gripWorldPos = this.getGripWorldPos(targetBody);
        var playerPos = this.getBodyPos();
        var playerToTarget = this.vec2d.set(gripWorldPos).subtract(playerPos);
        var distFromSurface = playerToTarget.magnitude() - PlayerSpirit.PLAYER_RAD;
        if (distFromSurface > PlayerSpirit.TRACTOR_BREAK_DIST) {
          this.releaseTarget();
        } else {
          var distPastRest = distFromSurface - PlayerSpirit.TRACTOR_HOLD_DIST;
          var distFactor;
          if (distPastRest < 0) {
            distFactor = distPastRest / PlayerSpirit.TRACTOR_HOLD_DIST;
          } else {
            var x = distPastRest / (PlayerSpirit.TRACTOR_BREAK_DIST - PlayerSpirit.TRACTOR_HOLD_DIST);
            distFactor = (x - x*x) * 4;
            // distFactor = (x*x*x - 2*x*x + x) * 27 / 4;
          }
          var pullForce = playerToTarget.scale(-PlayerSpirit.TRACTOR_HOLD_FORCE * distFactor * duration / distFromSurface);
          targetBody.applyForceAtWorldPosAndTime(pullForce, gripWorldPos, now);
          body.applyForceAtWorldPosAndTime(pullForce.scale(-1), playerPos, now);
          this.tractorForceFrac = Math.abs(distFactor);
        }
      }

      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;

      var friction = (this.screen.isPlaying() ? PlayerSpirit.FRICTION : 0.3) * duration;
      body.applyLinearFrictionAtTime(friction, now);
      body.applyAngularFrictionAtTime(friction, now);

      var newVel = this.vec2d.set(body.vel);

      if (!this.screen.isPlaying()) {
        var oldAngVelMag = Math.abs(this.getBodyAngVel());
        if (oldAngVelMag && oldAngVelMag < PlayerSpirit.STOPPING_ANGVEL) {
          this.setBodyAngVel(0);
        }
        var oldVelMagSq = newVel.magnitudeSquared();
        if (oldVelMagSq && oldVelMagSq < PlayerSpirit.STOPPING_SPEED_SQUARED) {
          newVel.reset();
        }
      }

      body.setVelAtTime(newVel, now);
      body.invalidatePath();
    }
    world.addTimeout(now + PlayerSpirit.FRICTION_TIMEOUT, this.id, PlayerSpirit.FRICTION_TIMEOUT_ID);
  }
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (!body) return;
  var now = this.now();
  var bodyPos = this.getBodyPos();
  this.camera.follow(bodyPos);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toSheerZOpXY(-this.aim.x, -this.aim.y))
      .multiply(this.mat44.toRotateZOp(-body.vel.x * 0.2));
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color)
      .setModelMatrix(this.modelMatrix)
      .drawStamp();

  var p1, p2, rad;

  // tractor beam
  var targetBody = this.getTargetBody();
  if (targetBody) {
    renderer.setStamp(this.stamps.lineStamp);
    this.aimColor.set(this.color).scale1(1.5);
    renderer.setColorVector(this.aimColor);
    p1 = bodyPos;
    p2 = this.getGripWorldPos(targetBody);
    var dist = p1.distance(p2);
    rad = this.tractorForceFrac * 2/3 + 0.05;
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    renderer.setModelMatrix(this.modelMatrix);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    renderer.setModelMatrix2(this.modelMatrix);
    renderer.drawStamp();
  } else {
    // aim guide
    renderer.setStamp(this.stamps.lineStamp);
    this.aimColor.set(this.color).scale1(0.5 + Math.random() * 0.3);
    renderer.setColorVector(this.aimColor);
    p1 = this.vec2d;
    p2 = this.vec2d2;
    var p1Dist = PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD - PlayerSpirit.SEEKSCAN_RAD;
    var p2Dist = PlayerSpirit.PLAYER_RAD + PlayerSpirit.TRACTOR_HOLD_DIST;
    rad = PlayerSpirit.SEEKSCAN_RAD;
    p1.set(this.aim).scaleToLength(p1Dist).add(bodyPos);
    p2.set(this.aim).scaleToLength(p2Dist).add(bodyPos);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    renderer.setModelMatrix(this.modelMatrix);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    renderer.setModelMatrix2(this.modelMatrix);
    renderer.drawStamp();
  }
};

PlayerSpirit.prototype.getTargetBody = function() {
  var b = null;
  if (this.targetBodyId) {
    b = this.screen.getBodyById(this.targetBodyId);
  } else {
    this.targetBodyId = 0;
  }
  return b;
};

PlayerSpirit.prototype.getGripWorldPos = function(targetBody) {
  var now = this.now();
  var tmp = Vec2d.alloc();
  this.gripWorldPos.set(this.targetRelPos).rot(targetBody.getAngPosAtTime(now)).add(targetBody.getPosAtTime(now, tmp));
  tmp.free();
  return this.gripWorldPos;
};

PlayerSpirit.prototype.explode = function() {
  var body = this.getBody();
  if (body) {
    var now = this.now();
    var pos = this.getBodyPos();
    var x = pos.x;
    var y = pos.y;

    // giant tube explosion
    var s = this.screen.splash;
    s.reset(1, this.stamps.tubeStamp);

    s.startTime = now;
    s.duration = 10;
    var rad = 10;
    var endRad = 0;

    s.startPose.pos.setXYZ(x, y, -0.5);
    s.endPose.pos.setXYZ(x, y, 0);
    s.startPose.scale.setXYZ(rad, rad, 1);
    s.endPose.scale.setXYZ(endRad, endRad, 1);

    s.startPose2.pos.setXYZ(x, y, 1);
    s.endPose2.pos.setXYZ(x, y, 1);
    s.startPose2.scale.setXYZ(-rad, -rad, 1);
    s.endPose2.scale.setXYZ(endRad, endRad, 1);

    s.startPose.rotZ = 0;
    s.endPose.rotZ = 0;
    s.startColor.set(this.color);
    s.endColor.setXYZ(0, 0, 0);

    this.screen.splasher.addCopy(s);

    // cloud particles

    var self = this;
    var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

    function addSplash(x, y, dx, dy, duration, sizeFactor) {
      s.reset(1, self.stamps.circleStamp);
      s.startTime = now;
      s.duration = duration;

      s.startPose.pos.setXYZ(x, y, -Math.random());
      s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
      var startRad = sizeFactor * body.rad;
      s.startPose.scale.setXYZ(startRad, startRad, 1);
      s.endPose.scale.setXYZ(0, 0, 1);

      s.startColor.set(self.color);
      s.endColor.set(self.color).scale1(0.5);
      self.screen.splasher.addCopy(s);
    }

    // fast outer particles
    particles = Math.ceil(15 * (1 + 0.5 * Math.random()));
    explosionRad = 20;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 15 * (1 + Math.random());
      dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random();
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 1);
    }

    // inner smoke ring
    particles = Math.ceil(20 * (1 + 0.5 * Math.random()));
    explosionRad = 4;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 20 * (0.5 + Math.random());
      dir = dirOffset + 2 * Math.PI * (i / particles) + Math.random() / 4;
      var thisRad = explosionRad + (0.5 + Math.random());
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 2);
    }
  }
};
