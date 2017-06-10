/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Test45BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();

  this.camera = new Camera(0.1, 0.4, 7);
  this.circle = new Circle();

  this.aim = new Vec2d();
  this.destAim = new Vec2d();
  this.aimSpeed = 0;

  this.beamState = BeamState.OFF;
  this.ejectStartTime = 0;
  this.targetBodyId = null;
  this.obstructionCount = 0;

  this.accel = new Vec2d();
  this.slot = null;
  
  this.oldKick = false;
  this.oldGrab = false;

  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec2d3 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 1;

PlayerSpirit.SPEED = 1;
PlayerSpirit.TRACTION = 0.3;
PlayerSpirit.FRICTION = 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 0.25;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

// dist from player surface to held obj surface
PlayerSpirit.TRACTOR_DRAG_DIST = PlayerSpirit.PLAYER_RAD;
PlayerSpirit.TRACTOR_WIELD_DIST = PlayerSpirit.PLAYER_RAD * 0.5;

// dist from player surface to held obj surface
PlayerSpirit.TRACTOR_BREAK_DIST = PlayerSpirit.PLAYER_RAD * 3;

PlayerSpirit.SEEKSCAN_RAD = PlayerSpirit.PLAYER_RAD/3;
// dist from player surface
PlayerSpirit.SEEKSCAN_DIST = (PlayerSpirit.TRACTOR_DRAG_DIST + PlayerSpirit.TRACTOR_BREAK_DIST) / 2;

PlayerSpirit.TRACTOR_MAX_ACCEL = 1;
PlayerSpirit.TRACTOR_MAX_FORCE = 1.5;

// If the tractor beam is obstructed this many times in a row, it will break.
PlayerSpirit.MAX_OBSTRUCTION_COUNT = 30;

PlayerSpirit.AIM_ANGPOS_ACCEL = 0.1;
PlayerSpirit.LOCK_ANGPOS_ACCEL = 0.4;
PlayerSpirit.ANGULAR_FRICTION = 0.4;

PlayerSpirit.EJECT_TIME = 5;
PlayerSpirit.EJECT_MAX_ACCEL = 2;
PlayerSpirit.EJECT_MAX_FORCE = 3;

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

  var playeBody = this.getBody();
  if (!playeBody) return;

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

  var newKick = controls.get(ControlName.BUTTON_1).getVal();
  var newGrab = controls.get(ControlName.BUTTON_2).getVal();
  var kickDown = !this.oldKick && newKick;
  var kickUp = this.oldKick && !newKick;
  var grabDown = !this.oldGrab && newGrab;
  var grabUp = this.oldGrab && !newGrab;
  this.oldKick = newKick;
  this.oldGrab = newGrab;

  // Settle on a new beamState
  if (this.beamState === BeamState.OFF) {
    // TODO: free kick
    if (grabDown) {
      this.beamState = BeamState.SEEKING;
    }
  } else if (this.beamState === BeamState.SEEKING) {
    if (grabUp) {
      this.breakBeam();
    }
  } else if (this.beamState === BeamState.DRAGGING) {
    if (kickDown) {
      this.breakBeam();
    } else if (grabDown) {
      this.beamState = BeamState.WIELDING;
    }
  } else if (this.beamState === BeamState.WIELDING) {
    if (kickDown) {
      this.beamState = BeamState.EJECTING;
      this.ejectStartTime = now;
    } else if (grabDown) {
      this.beamState = BeamState.ACTIVATING;
    }
  } else if (this.beamState === BeamState.ACTIVATING) {
    if (grabUp) {
      this.beamState = BeamState.WIELDING;
    }
  } else if (this.beamState === BeamState.EJECTING) {
    if (kickUp) {
      this.beamState = BeamState.DRAGGING;
    } else if (now - this.ejectStartTime > PlayerSpirit.EJECT_TIME) {
      this.eject();
      this.beamState = BeamState.OFF;
    }
  }

  if (this.beamState === BeamState.SEEKING) {
    this.handleSeeking();
  } else if (this.beamState === BeamState.DRAGGING) {
    this.handleDragging();
  } else if (this.beamState === BeamState.WIELDING) {
    this.handleWielding();
  } else if (this.beamState === BeamState.ACTIVATING) {
    this.handleActivating();
  } else if (this.beamState === BeamState.EJECTING) {
    this.handleEjecting();
  }
  stick.getVal(this.vec2d);
  var stickMag = this.vec2d.magnitude();
  var targetBody = this.getTargetBody();

  ////////////
  // MOVEMENT
  var speed = PlayerSpirit.SPEED;
  var traction = PlayerSpirit.TRACTION;

  if (stick.isTouched()) {
    if (!targetBody && stickMag) { // TODO remove target check?
      // When in keyboard precise-aiming mode, accelerate less
      // when the stick and the aim point in different directions.
      traction *= Math.max(0, this.vec2d.dot(this.aim)) / stickMag;
    }
    // traction slowdown
    this.accel.set(playeBody.vel).scale(-traction);

    this.vec2d.scale(speed * traction).clipToMaxLength(speed * traction);
    this.accel.add(this.vec2d);
    playeBody.addVelAtTime(this.accel, this.now());
  }

  ////////
  // AIM
  if (this.beamState !== BeamState.ACTIVATING) {
    var stickDotAim = stick.getVal(this.vec2d).scaleToLength(1).dot(this.aim);
    var reverseness = Math.max(0, -stickDotAim);
    if (touchlike) {
      this.handleTouchlikeAim(stick, stickMag, reverseness);
    } else {
      this.handleKeyboardAim(stick, stickMag, reverseness);
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
      if (this.beamState === BeamState.DRAGGING) {
        this.handleDragging();
      } else if (this.beamState === BeamState.WIELDING) {
        this.handleWielding();
      } else if (this.beamState === BeamState.ACTIVATING) {
        //this.handleActivating();
      } else if (this.beamState === BeamState.EJECTING) {
        this.handleEjecting();
      }
      var targetBody = this.getTargetBody();
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;

      if (!targetBody) {
        // Angle towards aim.
        var aimAngle = this.destAim.angle();
        var angleDiff = aimAngle - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.AIM_ANGPOS_ACCEL * angleDiff);
      } else {
        // Angle towards target.
        var angleDiff = this.getAngleToTarget() - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.LOCK_ANGPOS_ACCEL * angleDiff);
      }

      var angularFriction = (this.screen.isPlaying() ? PlayerSpirit.ANGULAR_FRICTION : 0.3) * duration;
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

PlayerSpirit.prototype.getAngleToTarget = function() {
  var playerPos = this.getBodyPos();
  var targetPos = this.getTargetBody().getPosAtTime(this.now(), Vec2d.alloc());
  var p = targetPos.subtract(playerPos);
  var angle = p.angle();
  targetPos.free();
  return angle;
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


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness) {
  // up/down/left/right buttons
  var aimFriction = 0.05;
  var dist;
  if (stickMag) {
    var correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
    dist = correction.magnitude();
    this.aimSpeed += 0.04 * dist;
    aimFriction = 0.01;
    this.destAim.add(correction.scale(Math.min(1, this.aimSpeed)));
  }
  this.aimSpeed *= (1 - aimFriction);
  this.destAim.scaleToLength(1);
  if (reverseness > 0.99) {
    // 180 degree flip, precise or not, so set it instantly.
    this.destAim.set(stick.getVal(this.vec2d)).scaleToLength(1);
    this.aim.set(this.destAim);
  } else {
    dist = this.aim.distance(this.destAim);
    var distContrib = dist * 0.25;
    var smoothContrib = 0.1 / (dist + 0.1);
    this.aim.slideByFraction(this.destAim, Math.min(1, smoothContrib + distContrib));
    this.aim.scaleToLength(1);
  }
};

PlayerSpirit.prototype.breakBeam = function() {
  // if (this.getTargetBody()) {
  //   this.destAim.setXY(0, 1).rot(this.getAngleToTarget());
  //   this.aim.set(this.destAim);
  // }
  this.targetBodyId = 0;
  this.beamState = BeamState.OFF;
};

PlayerSpirit.prototype.handleEjecting = function() {
  this.handleWielding();
};

PlayerSpirit.prototype.eject = function() {
  var targetBody = this.getTargetBody();
  if (targetBody) {
    // TODO: ejection force
    // this.destAim.setXY(0, 1).rot(this.getAngleToTarget());
    // this.aim.set(this.destAim);

    // var ejectFraction = (this.now() - this.ejectStartTime) / PlayerSpirit.EJECT_TIME;
    // ejectFraction = Math.min(1, Math.max(0, ejectFraction * 2 - 1));
    // // if (ejectFraction) {
    //   Spring.applyDampenedSpring(this.getBody(), this.getGripWorldPos(targetBody), targetBody, this.getHitchWorldPos(),
    //       PlayerSpirit.TRACTOR_BREAK_DIST, -PlayerSpirit.TRACTOR_EJECT_FORCE * ejectFraction, 0,
    //       PlayerSpirit.TRACTOR_MAX_FORCE * 20, PlayerSpirit.TRACTOR_BREAK_DIST * 10,
    //       this.now());
    // }
  }
  this.beamState = BeamState.OFF;
  this.targetBodyId = 0;
};

PlayerSpirit.prototype.repel = function() {
};

PlayerSpirit.prototype.handleSeeking = function() {
  var bestBody = null;
  var bestResultFraction = 2;
  var maxScanDist = PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD;
  var maxFanRad = Math.PI / 6;
  var scans = 2;
  var thisRad = this.getBody().rad;
  var scanPos = Vec2d.alloc();
  var aimAngle = this.aim.angle();
  scanPos.set(this.getBodyPos());
  for (var i = 0; i < scans; i++) {
    var radUnit = 2 * (Math.random()-0.5);
    var scanVel = this.vec2d.setXY(0, maxScanDist + thisRad)
        .rot(radUnit * maxFanRad)
        .scaleXY(0.5, 1)
        .rot(aimAngle);
    var resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
    this.screen.addTractorSeekSplash(scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD * 1.5, resultFraction, this.color);
    if (resultFraction !== -1) {
      var targetBody = this.getScanHitBody();
      if (targetBody && targetBody.shape !== Body.Shape.RECT && resultFraction < bestResultFraction) {
        bestResultFraction = resultFraction;
        bestBody = this.getScanHitBody();
      }
    }
  }

  if (bestBody) {
    // grab that thing!
    this.targetBodyId = bestBody.id;
    this.beamState = BeamState.DRAGGING;
  }
  scanPos.free();
};

/**
 * Applies tractor-beam forces to player and target, or breaks the beam if the target is out of range.
 * Also sets the tractorForceFrac field, for drawing.
 */
PlayerSpirit.prototype.handleDragging = function() {
  this.handleBeamForce(PlayerSpirit.TRACTOR_DRAG_DIST, PlayerSpirit.TRACTOR_MAX_ACCEL, PlayerSpirit.TRACTOR_MAX_FORCE,
      false);
};

/**
 * Applies tractor-beam forces to player and target, or breaks the beam if the target is out of range.
 * Also sets the tractorForceFrac field, for drawing.
 */
PlayerSpirit.prototype.handleWielding = function() {
  this.handleBeamForce(PlayerSpirit.TRACTOR_WIELD_DIST, PlayerSpirit.TRACTOR_MAX_ACCEL, PlayerSpirit.TRACTOR_MAX_FORCE,
      true, this.destAim.angle());
};

PlayerSpirit.prototype.handleBeamForce = function(targetDist, maxAccel, maxForce, isAngular, targetAngle) {
  var playerBody = this.getBody();
  var targetBody = this.getTargetBody();
  var now = this.now();
  var playerPos = this.getBodyPos();
  var targetPos = targetBody.getPosAtTime(now, Vec2d.alloc());
  var targetRad = targetBody.shape === Body.Shape.CIRCLE ? targetBody.rad : 1;

  // break beam if there's something in the way for a length of time
  var scanVel = this.vec2d.set(targetPos).subtract(playerPos);
  var obstructionScanRad = 0.01;
  scanVel.scaleToLength(scanVel.magnitude() - targetRad - obstructionScanRad);
  var result = this.scanWithVel(HitGroups.PLAYER_SCAN, playerPos, scanVel, obstructionScanRad);
  this.screen.addTractorSeekSplash(playerPos, scanVel, 0.2 + 0.3 * this.tractorForceFrac, result > 0 ? result : 1, this.color);
  if (result >= 0 && result < 0.9) {
    this.obstructionCount++;
    if (this.obstructionCount > PlayerSpirit.MAX_OBSTRUCTION_COUNT) {
      this.breakBeam();
      targetPos.free();
      return;
    }
  } else {
    this.obstructionCount = 0;
  }

  // Weaken obstructed beams.
  // Unobstructedness is from 1 (not obstructed) to 0 (totally obstructed)
  var unobstructedness = 1 - this.obstructionCount / PlayerSpirit.MAX_OBSTRUCTION_COUNT;

  var deltaPos = Vec2d.alloc().set(targetPos).subtract(playerPos);
  var surfaceDist = deltaPos.magnitude() - playerBody.rad - targetRad;
  var p0 = surfaceDist - targetDist;

  var deltaVel = Vec2d.alloc().set(targetBody.vel).subtract(playerBody.vel);
  var v0 = this.vec2d2.set(deltaVel).dot(this.vec2d.set(deltaPos).scaleToLength(1));

  var maxA = maxAccel * unobstructedness * Math.abs(p0);
  var forceMagSum = 0;
  if (p0 >= PlayerSpirit.TRACTOR_BREAK_DIST) {
    this.breakBeam();
  } else {
    var playerForce = Vec2d.alloc();
    var targetForce = Vec2d.alloc();
    var playerForceProportion = 0.5;
    var pushAccelMag = Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
    var forceMag = targetBody.mass * pushAccelMag;
    targetForce.set(deltaPos).scaleToLength((1 - playerForceProportion) * forceMag);
    playerForce.set(deltaPos).scaleToLength((-playerForceProportion) * forceMag);

    if (isAngular) {
      p0 = deltaPos.angle() - targetAngle;
      maxA = maxAccel * unobstructedness * (Math.min(Math.abs(p0), Math.PI / 4));
      while (p0 < -Math.PI) p0 += 2 * Math.PI;
      while (p0 > Math.PI) p0 -= 2 * Math.PI;

      v0 = this.vec2d2.set(deltaVel).dot(this.vec2d.set(deltaPos).scaleToLength(-1).rot90Right());

      var turnAccelMag = -Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
      var turnForceMag = Math.min(targetBody.mass, playerBody.mass) * turnAccelMag;
      targetForce.add(this.vec2d.set(deltaPos).rot90Right().scaleToLength((1 - playerForceProportion) * turnForceMag));
      playerForce.add(this.vec2d.set(deltaPos).rot90Right().scaleToLength(-playerForceProportion * turnForceMag));
    }
    forceMagSum = targetForce.magnitude() + playerForce.magnitude();
    if (forceMagSum > maxForce) {
      var scaleFactor = maxForce / forceMagSum;
      targetForce.scale(scaleFactor);
      playerForce.scale(scaleFactor);
      forceMagSum = maxForce;
    }
    playerBody.addVelAtTime(playerForce.scale(1 / playerBody.mass), now);
    targetBody.addVelAtTime(targetForce.scale(1 / targetBody.mass), now);
    playerForce.free();
    targetForce.free();
  }

  this.tractorForceFrac = forceMagSum / maxForce;
  deltaPos.free();
  deltaVel.free();
  targetPos.free();
};

PlayerSpirit.prototype.handleActivating = function() {
  this.handleWielding();
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (!body) return;
  var bodyPos = this.getBodyPos();
  this.camera.follow(bodyPos);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toShearZOpXY(-this.aim.x, -this.aim.y))
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
    this.aimColor.set(this.color).scale1(0.75);
    renderer.setColorVector(this.aimColor);
    p1 = bodyPos;
    p2 = targetBody.getPosAtTime(this.now(), this.vec2d);
    rad = unobstructedness * (0.5 + 0.5*this.tractorForceFrac) * body.rad * 0.4;
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
    var p1Dist = PlayerSpirit.PLAYER_RAD * 3.5;
    var p2Dist = PlayerSpirit.PLAYER_RAD * 2;
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
