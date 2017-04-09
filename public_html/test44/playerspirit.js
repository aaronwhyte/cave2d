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

  this.aimLocked = false;
  this.angleLocked = false;
  this.destAngle = 0;

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.obstructionCount = 0;

  this.targetBodyId = null;
  // relative to the target body, where did the player grab?
  this.targetRelPos = new Vec2d();
  // What was the direction of the beam relative to the target when it struck?
  this.targetBeamDir = new Vec2d();
  this.gripWorldPos = new Vec2d();
  this.hitchWorldPos = new Vec2d();

  this.accel = new Vec2d();
  this.slot = null;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 1;

PlayerSpirit.SPEED = 1.5;
PlayerSpirit.TRACTION = 0.4;
PlayerSpirit.FRICTION = 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 0.3;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;
PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

// dist from player surface, not from player center
PlayerSpirit.TRACTOR_HOLD_DIST = PlayerSpirit.PLAYER_RAD;
PlayerSpirit.SEEKSCAN_DIST = PlayerSpirit.PLAYER_RAD * 3;
PlayerSpirit.SEEKSCAN_RAD = 0.01;
// PlayerSpirit.TRACTOR_BREAK_DIST = 3 + PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.SEEKSCAN_RAD;
PlayerSpirit.TRACTOR_BREAK_DIST = PlayerSpirit.SEEKSCAN_DIST * 2;

PlayerSpirit.TRACTOR_HOLD_FORCE = 0.25;
PlayerSpirit.TRACTOR_DAMPING_FRACTION = 0.06;

PlayerSpirit.TRACTOR_MAX_FORCE = 20;

// If the tractor beam is obstructed this many times in a row, it will break.
PlayerSpirit.MAX_OBSTRUCTION_COUNT = 30;

PlayerSpirit.AIM_ANGPOS_ACCEL = 0.04;
PlayerSpirit.LOCK_ANGPOS_ACCEL = 0.9;
PlayerSpirit.ANGULAR_FRICTION = 0.1;

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

  b.turnable = true;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.grip = 0.5;
  b.elasticity = 0.7;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.handleInput = function() {
  if (!this.slot) return;
  var state = this.slot.stateName;
  if (state !== ControlState.PLAYING) return;

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

  this.aimLocked = false && (b1.getVal() || b2.getVal()) && this.getTargetBody();
  var preciseKeyboard = !touchlike && !stick.isSpeedTriggerDown() && !this.aimLocked;
  stick.getVal(this.vec2d);
  var stickMag = this.vec2d.magnitude();

  var oldAngleLocked = this.angleLocked;
  this.angleLocked = this.getTargetBody() && (b1.getVal() || b2.getVal());
  if (!oldAngleLocked && this.angleLocked) {
    this.destAngle = this.getBodyAngPos();
  }

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
  if (this.aimLocked) {
    // lock destAim at whatever it was going into aimlock, so aim doesn't change when coming out of aimlock.
    this.destAim.set(this.aim);
  } else {
    if (touchlike) {
      this.handleTouchlikeAim(stick, stickMag, reverseness);
    } else {
      this.handleKeyboardAim(stick, stickMag, reverseness, preciseKeyboard);
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


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness, preciseKeyboard) {
  // up/down/left/right buttons
  var slowAimFriction = 0.05;
  if (stickMag) {
    if (preciseKeyboard) {
      var correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
      dist = correction.magnitude();
      this.slowAimSpeed += 0.04 * dist;
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
  if (!this.aimLocked && reverseness > 0.99) {
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
  var maxScanDist = PlayerSpirit.PLAYER_RAD + PlayerSpirit.SEEKSCAN_DIST - PlayerSpirit.SEEKSCAN_RAD;
  var scanVel = this.vec2d.set(this.aim).scaleToLength(maxScanDist);
  var resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
  if (resultFraction === -1) {
    // no hit
    // TODO: way better graphics
    this.screen.addScanSplash(scanPos, scanVel, Math.random() * 0.2 + 0.1, resultFraction);
  } else {
    // grab that thing!
    var targetBody = this.getScanHitBody();
    if (targetBody) {
      var now = this.now();
      this.targetBodyId = targetBody.id;
      var contactPos = Vec2d.alloc().set(scanVel).scale(resultFraction).add(scanPos);
      var targetPos = targetBody.getPosAtTime(now, Vec2d.alloc());
      this.targetRelPos.set(contactPos).subtract(targetPos).rot(-targetBody.getAngPosAtTime(now));
      if (targetBody.shape === Body.Shape.RECT) {
        this.targetBeamDir.set(scanVel).scaleToLength(1).rot(-targetBody.getAngPosAtTime(now));
        // this.targetBeamDir.reset();
      } else {
        this.targetBeamDir.set(this.targetRelPos).scale(-1);
      }
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
  if (timeoutVal === PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal === -1) {
    var duration = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.getBody();
    if (body) {
      // tractor beam force?
      var targetBody = this.getTargetBody();
      if (targetBody) {
        this.handleTractorBeam(body, targetBody, duration);
      }

      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;

      if (!targetBody) {
        // Angle towards aim.
        var aimAngle = Math.atan2(this.destAim.x, this.destAim.y);
        var angleDiff = aimAngle - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.AIM_ANGPOS_ACCEL * (angleDiff));
      } else if (this.angleLocked) {
        // Angle towards destAngle.
        var angleDiff = this.destAngle - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.LOCK_ANGPOS_ACCEL * (angleDiff));
      }

      var angularFriction = (this.screen.isPlaying() ? (PlayerSpirit.ANGULAR_FRICTION * (this.angleLocked ? 3 : 1)) : 0.3) * duration;
      body.applyAngularFrictionAtTime(angularFriction, now);

      var linearFriction = (this.screen.isPlaying() ? PlayerSpirit.FRICTION : 0.3) * duration;
      body.applyLinearFrictionAtTime(linearFriction, now);

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

/**
 * Applies tractor-beam forces to player and target, or breaks the beam if the target is out of range.
 * Also sets the tractorForceFrac field, for drawing.
 * @param {Body} playerBody
 * @param {Body} targetBody
 */
PlayerSpirit.prototype.handleTractorBeam = function(playerBody, targetBody) {
  var now = this.now();
  var playerBasePos = this.getHitchWorldPos();
  var targetBasePos = this.getGripWorldPos(targetBody);

  // break beam if there's something in the way for a length of time
  var result = this.scanWithVel(HitGroups.PLAYER_SCAN, playerBasePos,
      this.vec2d.set(targetBasePos).subtract(playerBasePos), 0.01);
  if (result >= 0 && result < 0.5) {
    this.obstructionCount++;
    if (this.obstructionCount > PlayerSpirit.MAX_OBSTRUCTION_COUNT) {
      this.releaseTarget();
      return;
    }
  } else {
    this.obstructionCount = 0;
  }

  var holdDist = PlayerSpirit.TRACTOR_HOLD_DIST * (this.angleLocked ? 0.8 : 1);

  var playerOffsetUnit = Vec2d.alloc(0, 1).rot(playerBody.getAngPosAtTime(now));
  var targetOffsetUnit = Vec2d.alloc().set(this.targetBeamDir).scaleToLength(-1).rot(targetBody.getAngPosAtTime(now));
  var forceMagSum = 0;
  var targetInRange = true;

  // weaken the beam the longer it is obstructed
  var unobstructedness = 1 - this.obstructionCount / PlayerSpirit.MAX_OBSTRUCTION_COUNT;
  function tractor(pPos, tPos) {
    var forceMag = Spring.applyDampenedSpring(
        playerBody, pPos,
        targetBody, tPos,
        0,
        0.5 * unobstructedness * PlayerSpirit.TRACTOR_HOLD_FORCE,
        PlayerSpirit.TRACTOR_DAMPING_FRACTION,
        0.5 * PlayerSpirit.TRACTOR_MAX_FORCE,
        PlayerSpirit.TRACTOR_BREAK_DIST - holdDist,
        now);
    if (forceMag < 0) {
      targetInRange = false;
    } else {
      forceMagSum += forceMag;
    }
  }
  var pTemp = Vec2d.alloc();
  var tTemp = Vec2d.alloc();
  var offsetFactor = holdDist;
  tractor(playerBasePos, tTemp.set(targetOffsetUnit).scale(offsetFactor).add(targetBasePos));
  tractor(pTemp.set(playerOffsetUnit).scale(offsetFactor).add(playerBasePos), targetBasePos);

  if (!targetInRange) {
    this.releaseTarget();
  } else {
    this.tractorForceFrac = forceMagSum / PlayerSpirit.TRACTOR_MAX_FORCE;
  }
  tTemp.free();
  pTemp.free();
  targetOffsetUnit.free();
  playerOffsetUnit.free();
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (!body) return;
  var bodyPos = this.getBodyPos();
  this.camera.follow(bodyPos);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toSheerZOpXY(-this.aim.x, -this.aim.y))
      .multiply(this.mat44.toRotateZOp(-body.getAngPosAtTime(this.now())));
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color)
      .setModelMatrix(this.modelMatrix)
      .drawStamp();

  var p1, p2, rad;

  // tractor beam
  var targetBody = this.getTargetBody();
  if (targetBody) {
    var unobstructedness = 1 - this.obstructionCount / PlayerSpirit.MAX_OBSTRUCTION_COUNT;
    renderer.setStamp(this.stamps.lineStamp);
    this.aimColor.set(this.color).scale1(1.5);
    renderer.setColorVector(this.aimColor);
    p1 = this.getHitchWorldPos();
    p2 = this.getGripWorldPos(targetBody);
    rad = unobstructedness * (this.tractorForceFrac * 2 / 3 + body.rad / 10 + (this.angleLocked ? body.rad / 8 : 0));
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

  // aim guide
  if (!targetBody) {
    renderer.setStamp(this.stamps.lineStamp);
    this.aimColor.set(this.color).scale1(0.5 + Math.random() * 0.3);
    renderer.setColorVector(this.aimColor);
    p1 = this.vec2d;
    p2 = this.vec2d2;
    var p1Dist = PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD - PlayerSpirit.SEEKSCAN_RAD;
    var p2Dist = PlayerSpirit.PLAYER_RAD + PlayerSpirit.TRACTOR_HOLD_DIST;
    rad = 0.15;
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

PlayerSpirit.prototype.getHitchWorldPos = function() {
  var tmp = Vec2d.alloc();
  this.hitchWorldPos.setXY(0, this.getBody().rad).rot(this.getBodyAngPos()).add(this.getBodyPos(tmp));
  tmp.free();
  return this.hitchWorldPos;
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
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 2);
    }
  }
};
