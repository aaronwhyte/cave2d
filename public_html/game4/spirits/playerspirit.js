/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game4BaseScreen.SpiritType.PLAYER;
  this.team = Team.PLAYER;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();

  this.aim = new Vec2d();
  this.destAim = new Vec2d();

  this.beamState = BeamState.OFF;
  this.targetBodyId = null;
  this.obstructionCount = 0;

  this.accel = new Vec2d();
  this.keyMult = 0.25;
  this.tractionMult = 0;

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

  // combat
  this.toughness = 1;
  this.damage = 0;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 1;

PlayerSpirit.SPEED = 2;
PlayerSpirit.TRACTION = 0.07;
PlayerSpirit.KEY_MULT_ADJUST = 0.075;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.WIELD_MAX_ACCEL = 6 * 0.7;
PlayerSpirit.WIELD_MAX_FORCE = 1.8 * 0.7;
PlayerSpirit.WIELD_REST_DIST = PlayerSpirit.PLAYER_RAD * 0.5;
PlayerSpirit.WIELD_BREAK_DIST = PlayerSpirit.PLAYER_RAD * 3;

PlayerSpirit.SEEKSCAN_RAD = PlayerSpirit.PLAYER_RAD/5;
// dist from player surface
PlayerSpirit.GRAB_DIST = PlayerSpirit.WIELD_BREAK_DIST - PlayerSpirit.SEEKSCAN_RAD;
PlayerSpirit.SEEKSCAN_DIST = PlayerSpirit.PLAYER_RAD * 15;

// If the tractor beam is obstructed this many times in a row, it will break.
PlayerSpirit.MAX_OBSTRUCTION_COUNT = 30;

PlayerSpirit.AIM_ANGPOS_ACCEL = 0.4;
PlayerSpirit.LOCK_ANGPOS_ACCEL = 0.4;
PlayerSpirit.ANGULAR_FRICTION = 0.4;
PlayerSpirit.BEAM_ANGULAR_ACCEL = 0.3;

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

PlayerSpirit.prototype.handleInput = function(controls) {
  var playerBody = this.getBody();
  if (!playerBody) return;

  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var now = this.now();
  var duration = now - this.lastInputTime;
  this.lastInputTime = now;

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
    if (kickDown) {
      this.freeKick(Math.PI / 5);
    }
    if (grabDown) {
      this.setBeamState(BeamState.SEEKING);
    }
  } else if (this.beamState === BeamState.SEEKING) {
    if (grabUp) {
      this.breakBeam();
    }
  } else if (this.beamState === BeamState.WIELDING) {
    if (kickDown) {
      this.breakBeam();
    } else if (grabDown) {
      this.setBeamState(BeamState.ACTIVATING);
    }
  } else if (this.beamState === BeamState.ACTIVATING) {
    if (grabUp) {
      this.setBeamState(BeamState.WIELDING);
    }
  }
  this.breakBeamIfTargetMissing();
  this.handleBeamState();

  stick.getVal(this.vec2d);
  var stickMag = this.vec2d.magnitude();
  var stickDotAim = stickMag ? this.vec2d.dot(this.aim) / stickMag : 0; // aim is always length 1
  var aimLocked = BeamState.isAimLocked(this.beamState);

  ////////////
  // MOVEMENT
  var speed = PlayerSpirit.SPEED;

  // gradually ramp up key-based speed, for low-speed control.
  if (!touchlike) {
    this.keyMult += PlayerSpirit.KEY_MULT_ADJUST * (stickMag ? 1 : -2);
    this.keyMult = Math.max(PlayerSpirit.KEY_MULT_ADJUST, Math.min(1, this.keyMult));
    speed *= this.keyMult;
  }

  if (stickMag > 0.01) {
    this.tractionMult = 1;
  } else {
    this.tractionMult = Math.max(0, this.tractionMult - 0.01);
  }
  var traction = PlayerSpirit.TRACTION * this.tractionMult;
  // Half of traction's job is to stop you from sliding in the direction you're already going.
  this.accel.set(playerBody.vel).scale(-traction);

  // The other half of traction's job is to get you going where you want.
  // vec2d is the stick input right now.
  this.vec2d.scale(speed * traction * (aimLocked ? 1 : Math.abs(stickDotAim)));
  this.accel.add(this.vec2d);
  playerBody.addVelAtTime(this.accel, this.now());

  ////////
  // AIM
  if (!aimLocked) {
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
    var unshrinkingMag = 0.8;
    if (stickMag < unshrinkingMag) {
      var stickScale = 0.95 + 0.05 * stickMag / unshrinkingMag;
      stick.scale(stickScale);
    }
  }
};

PlayerSpirit.prototype.breakBeamIfTargetMissing = function() {
  switch (this.beamState) {
    case BeamState.DRAGGING:
    case BeamState.WIELDING:
    case BeamState.ACTIVATING:
    case BeamState.EJECTING:
      if (!this.getTargetBody()) {
        this.breakBeam();
      }
  }
};

PlayerSpirit.prototype.handleBeamState = function() {
  if (this.beamState === BeamState.SEEKING) {
    this.handleSeeking();
  } else if (this.beamState === BeamState.WIELDING) {
    this.handleWielding();
  } else if (this.beamState === BeamState.ACTIVATING) {
    this.handleActivating();
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
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;
      var targetBody = this.getTargetBody();
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

      var angularFriction = 1 - Math.pow(1 - (this.screen.isPlaying() ? PlayerSpirit.ANGULAR_FRICTION : 0.3), duration);
      body.applyAngularFrictionAtTime(angularFriction, now);

      var linearFriction = 1 - Math.pow(1 - (this.getFriction()), duration);
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
  return this.getAngleToBody(this.getTargetBody());
};

PlayerSpirit.prototype.getSurfaceDistToTarget = function() {
  var playerPos = this.getBodyPos();
  var targetPos = this.getTargetBody().getPosAtTime(this.now(), Vec2d.alloc());
  return targetPos.distance(playerPos) - this.getBody().rad - this.getTargetBody().rad;
};

PlayerSpirit.prototype.handleTouchlikeAim = function(stick, stickMag, reverseness) {
  // touch or pointer-lock
  if (stickMag && stick.isTouched()) {
    // Any stick vector more than 90 degrees away from the aim vector is somewhat reverse:
    // 0 for 90 degrees, 1 for 180 degrees.
    // The more reverse the stick is, the less the old aim's contribution to the new aim.
    // That makes it easier to flip the aim nearly 180 degrees quickly.
    // Without that, the player ends up facing the same way and gliding backwards instead of aiming.
    this.destAim.scale(0.5 * (1 - reverseness * 0.9))
        .add(stick.getVal(this.vec2d).scale(0.5 + 0.5 * stickMag));
    this.destAim.scaleToLength(1);
    var dist = stick.getVal(this.vec2d).distance(this.destAim);
    this.aim.slideByFraction(this.destAim, Math.min(1, dist * 2));
  }
  this.aim.slideByFraction(this.destAim, 0.5).scaleToLength(1);
};


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness) {
  // up/down/left/right buttons
  var dist = 0;
  if (stickMag) {
    var correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
    dist = correction.magnitude();
    this.destAim.add(correction.scale(Math.min(1, this.keyMult * this.keyMult)));
  }
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
  this.setBeamState(BeamState.OFF);
};

PlayerSpirit.prototype.handleSeeking = function() {
  var bestBody = null;
  var bestResultFraction = 2;
  var maxScanDist = PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD;
  var maxFanRad = Math.PI / 8;
  var scans = 1;
  var thisRad = this.getBody().rad;
  var scanPos = Vec2d.alloc().set(this.getBodyPos());
  var scanVel = Vec2d.alloc();
  var aimAngle = this.aim.angle();
  var forceVec = Vec2d.alloc();
  var forcePos = Vec2d.alloc();
  for (var i = 0; i < scans; i++) {
    var radUnit = 2 * (Math.random()-0.5);
    scanVel.setXY(0, maxScanDist + thisRad)
        .rot(radUnit * maxFanRad)
        .scaleXY(0.5, 1)
        .rot(aimAngle);
    var resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
    var splashed = false;
    if (resultFraction !== -1) {
      var foundBody = this.getScanHitBody();
      if (foundBody && foundBody.mass < Infinity) {
        // pull it closer
        forcePos.set(scanVel).scale(resultFraction).add(scanPos).scale(0.1)
            .add(foundBody.getPosAtTime(this.now(), this.vec2d)).scale(1 / (1 + 0.1));
        forceVec.set(scanVel).scaleToLength(-(1 - resultFraction * 0.9) * 0.2);
        foundBody.applyForceAtWorldPosAndTime(forceVec, forcePos, this.now());
        this.screen.addTractorSeekSplash(true, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD, resultFraction, this.color);
        splashed = true;
        if (resultFraction < bestResultFraction &&
            resultFraction * maxScanDist <= PlayerSpirit.GRAB_DIST) {
          // prepare to grab that thing, unless something better comes along
          bestResultFraction = resultFraction;
          bestBody = foundBody;
        }
      }
    }
    if (!splashed)  {
      this.screen.addTractorSeekSplash(false, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD, resultFraction, this.color);
    }
  }

  if (bestBody) {
    // grab that thing!
    this.targetBodyId = bestBody.id;
    this.setBeamState(BeamState.WIELDING);
  }
  scanPos.free();
  scanVel.free();
  forceVec.free();
  forcePos.free();
};

PlayerSpirit.prototype.setBeamState = function(newState) {
  var target = this.getTargetSpirit();
  if (target && target.isActivatable()) {
    // connect or disconnect?
    if (BeamState.isOutputish(newState)) {
      if (!target.isInputSource(this.id)) {
        target.addInputSource(this.id);
      }
    } else {
      if (target.isInputSource(this.id)) {
        target.removeInputSource(this.id);
        delete this.outputIdsToVals[target.id];
      }
    }
    if (target.isInputSource(this.id)) {
      // set new val?
      var newVal = newState === BeamState.ACTIVATING ? 1 : 0;
      if (newVal !== this.outputIdsToVals[target.id]) {
        this.outputIdsToVals[target.id] = newVal;
        target.onInputChanged(this.id, newVal);
      }
    }
  }
  this.beamState = newState;
  if (this.beamState === BeamState.OFF) {
    this.targetBodyId = 0;
  }
};

PlayerSpirit.prototype.setOutputToTarget = function(val) {
  var target = this.getTargetSpirit();
  if (target && target.isActivatable() && target.isInputSource(this.id) && val !== this.outputIdsToVals[target.id]) {
    this.outputIdsToVals[target.id] = val;
    target.onInputChanged(this.id, val);
  }
};


/**
 * Applies tractor-beam forces to player and target, or breaks the beam if the target is out of range.
 * Sets the tractorForceFrac field, for drawing.
 */
PlayerSpirit.prototype.handleWielding = function() {
  // physics
  this.handleBeamForce(PlayerSpirit.WIELD_REST_DIST, PlayerSpirit.WIELD_BREAK_DIST,
      PlayerSpirit.WIELD_MAX_ACCEL, PlayerSpirit.WIELD_MAX_FORCE,
      true, this.destAim.angle());
  if (this.getTargetBody()) {
    this.handleBeamTorque(this.getAngleToTarget(), PlayerSpirit.BEAM_ANGULAR_ACCEL);
  }
};

PlayerSpirit.prototype.handleBeamForce = function(restingDist, breakDist, maxAccel, maxForce, isAngular, restingAngle) {
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
  // this.screen.addTractorSeekSplash(playerPos, scanVel, 0.2 + 0.3 * this.tractorForceFrac, result > 0 ? result : 1, this.color);
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
  var p0 = surfaceDist - restingDist;

  var deltaVel = Vec2d.alloc().set(targetBody.vel).subtract(playerBody.vel);
  var v0 = this.vec2d2.set(deltaVel).dot(this.vec2d.set(deltaPos).scaleToLength(1));

  var maxA = maxAccel * unobstructedness * Math.abs(p0 * p0 / (restingDist * restingDist));
  var forceMagSum = 0;
  if (p0 >= breakDist) {
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
      p0 = deltaPos.angle() - restingAngle;
      maxA = maxAccel * (Math.min(Math.abs(p0), Math.PI / 4)) * 0.5;
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

PlayerSpirit.prototype.handleBeamTorque = function(restingAngle, maxA) {
  var playerBody = this.getBody();
  var targetBody = this.getTargetBody();
  var now = this.now();

  var p0 = targetBody.getAngPosAtTime(now) - restingAngle;
  while (p0 < -Math.PI) p0 += 2 * Math.PI;
  while (p0 > Math.PI) p0 -= 2 * Math.PI;

  // TODO actual target angular vel has to do with target/player pair orbit
  var v0 = targetBody.angVel - playerBody.angVel;

  var angPulse = Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
  targetBody.addAngVelAtTime(angPulse, now);
};

PlayerSpirit.prototype.handleActivating = function() {
  this.handleWielding();
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (!body) return;
  var bodyPos = this.getBodyPos();
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
    this.aimColor.setRGBA(0, 1, 0);
    renderer.setColorVector(this.aimColor);
    p1 = bodyPos;
    p2 = targetBody.getPosAtTime(this.now(), this.vec2d);
    var volume = 1/3 * PlayerSpirit.PLAYER_RAD * PlayerSpirit.WIELD_REST_DIST;
    rad = Math.min(body.rad * 0.5, targetBody.rad, unobstructedness * volume / this.getSurfaceDistToTarget());
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

PlayerSpirit.prototype.getTargetSpirit = function() {
  return this.screen.getSpiritForBody(this.getTargetBody());
};

PlayerSpirit.prototype.explode = function() {
  var body = this.getBody();
  if (body) {
    var now = this.now();
    var pos = this.getBodyPos();
    var x = pos.x;
    var y = pos.y;

    this.sounds.playerExplode(pos);
    this.screen.addPlayerExplosionSplash(pos, this.color);
    this.screen.removeByBodyId(this.bodyId);
  }
};

/**
 * Fire shotgun-like repulsor force, when the player presses
 * the kick button while not holding anything.
 */
PlayerSpirit.prototype.freeKick = function(spread) {
  var shots = 5;
  var angPos = this.destAim.angle();
  var scanPos = Vec2d.alloc().set(this.getBodyPos());
  var scanVel = Vec2d.alloc();
  var forceVec = Vec2d.alloc();
  var forcePos = Vec2d.alloc();
  for (var i = 0; i < shots; i++) {
    var angle = angPos + spread * (i + 0.5) / shots - spread / 2;
    var dist = PlayerSpirit.PLAYER_RAD * 11;
    scanVel.setXY(0, dist).rot(angle);
    var resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
    var splashed = false;
    if (resultFraction !== -1) {
      var foundBody = this.getScanHitBody();
      if (foundBody) {
        // Apply force at a mix of the contact point and the center of mass.
        var contactPointMix = 0.2;
        forcePos.set(scanVel).scale(resultFraction).scale(contactPointMix)
            .add(foundBody.getPosAtTime(this.now(), this.vec2d)).subtract(scanPos)
            .scale(1 / (1 + contactPointMix))
            .add(scanPos);
        // Force in the direction of the scan.
        forceVec.set(scanVel).scaleToLength(0.5);
        foundBody.applyForceAtWorldPosAndTime(forceVec, forcePos, this.now());
        this.screen.addKickHitSplash(scanPos, scanVel, resultFraction);
        splashed = true;
      }
    }
    if (!splashed)  {
      this.screen.addKickMissSplash(scanPos, scanVel);
    }
  }
  scanVel.free();
  scanPos.free();
  forceVec.free();
  forcePos.free();
};

PlayerSpirit.prototype.die = function() {
  this.screen.killPlayerSpirit(this);
};
