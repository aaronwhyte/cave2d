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
  this.seekTargetBodyId = null;

  this.accel = new Vec2d();
  this.keyMult = 0.25;
  this.tractionMult = 0;

  this.oldKick = false;
  this.oldGrab = false;

  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  // combat
  this.toughness = 1;
  this.damage = 0;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 0.99;

PlayerSpirit.SPEED = 2;
PlayerSpirit.TRACTION = 0.1;

PlayerSpirit.KEY_MULT_ADJUST = 0.075;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.WIELD_MAX_ACCEL = 6;
PlayerSpirit.WIELD_MAX_FORCE = 3;
PlayerSpirit.WIELD_REST_DIST = PlayerSpirit.PLAYER_RAD * 0.25;
PlayerSpirit.WIELD_BREAK_DIST = PlayerSpirit.PLAYER_RAD * 3;

PlayerSpirit.SEEKSCAN_RAD = PlayerSpirit.PLAYER_RAD * 0.25;
PlayerSpirit.SEEKSCAN_FAN_ANGLE = Math.PI / 4;
PlayerSpirit.SEEKSCAN_FORCE = 0.1;
PlayerSpirit.SEEKSCAN_DIST = PlayerSpirit.PLAYER_RAD * 20;

PlayerSpirit.KICK_DIST = PlayerSpirit.PLAYER_RAD * 12;
PlayerSpirit.KICK_FORCE = 0.7;

// dist from player surface
PlayerSpirit.GRAB_DIST = PlayerSpirit.WIELD_BREAK_DIST - PlayerSpirit.SEEKSCAN_RAD;

// If the tractor beam is obstructed this many times in a row, it will break.
PlayerSpirit.MAX_OBSTRUCTION_COUNT = 30;

PlayerSpirit.AIM_ANGPOS_ACCEL = 0.4;
PlayerSpirit.LOCK_ANGPOS_ACCEL = 0.4;
PlayerSpirit.ANGULAR_FRICTION = 0.4;
PlayerSpirit.BEAM_ANGULAR_ACCEL = 0.2;

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

PlayerSpirit.factory = function(playScreen, pos, dir) {
  let world = playScreen.world;

  let spirit = new PlayerSpirit(playScreen);
  spirit.setColorRGB(1, 1, 1);

  let spiritId = world.addSpirit(spirit);
  let b = spirit.createBody(pos, dir);
  spirit.bodyId = world.addBody(b);

  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

PlayerSpirit.prototype.getModelId = function() {
  return ModelIds.PLAYER;
};

PlayerSpirit.prototype.createBody = function(pos, dir) {
  let density = 1;
  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.now());
  b.rad = PlayerSpirit.PLAYER_RAD;
  b.hitGroup = this.screen.getHitGroups().PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;

  b.turnable = true;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.grip = 0.3;
  b.elasticity = 0.25;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.getCameraFocusPos = function() {
  return this.vec2d.set(this.aim).scaleToLength(PlayerSpirit.PLAYER_RAD * 3).add(this.getBodyPos());
};

PlayerSpirit.prototype.handleInput = function(controls) {
  let playerBody = this.getBody();
  if (!playerBody) return;

  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  let now = this.now();
  let duration = now - this.lastInputTime;
  this.lastInputTime = now;

  let stick = controls.get(ControlName.STICK);
  let touchlike = stick.isTouchlike();

  ////////////
  // BUTTONS

  let newKick = controls.get(ControlName.BUTTON_1).getVal();
  let newGrab = controls.get(ControlName.BUTTON_2).getVal();
  let kickDown = !this.oldKick && newKick;
  let kickUp = this.oldKick && !newKick;
  let grabDown = !this.oldGrab && newGrab;
  let grabUp = this.oldGrab && !newGrab;
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
  let stickMag = this.vec2d.magnitude();
  let stickDotAim = stickMag ? this.vec2d.dot(this.aim) / stickMag : 0; // aim is always length 1
  let aimLocked = BeamState.isAimLocked(this.beamState);

  ////////////
  // MOVEMENT
  let speed = PlayerSpirit.SPEED;

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
  let traction = PlayerSpirit.TRACTION * this.tractionMult;
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
    let reverseness = Math.max(0, -stickDotAim);
    if (touchlike) {
      this.handleTouchlikeAim(stick, stickMag, reverseness);
    } else {
      this.handleKeyboardAim(stick, stickMag, reverseness);
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
  let now = this.now();
  if (timeoutVal === PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal === -1) {
    let duration = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    let body = this.getBody();
    if (body) {
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;
      let targetBody = this.getTargetBody();
      if (!targetBody) {
        // Angle towards aim.
        let aimAngle = this.destAim.angle();
        let angleDiff = aimAngle - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.AIM_ANGPOS_ACCEL * angleDiff);
      } else {
        // Angle towards target.
        let angleDiff = this.getAngleToTarget() - this.getBodyAngPos();
        while (angleDiff > Math.PI) {
          angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
          angleDiff += 2 * Math.PI;
        }
        this.addBodyAngVel(duration * PlayerSpirit.LOCK_ANGPOS_ACCEL * angleDiff);
      }

      let angularFriction = 1 - Math.pow(1 - (this.screen.isPlaying() ? PlayerSpirit.ANGULAR_FRICTION : 0.3), duration);
      body.applyAngularFrictionAtTime(angularFriction, now);

      let linearFriction = 1 - Math.pow(1 - (this.getFriction()), duration);
      body.applyLinearFrictionAtTime(linearFriction, now);

      let newVel = this.vec2d.set(body.vel);

      if (!this.screen.isPlaying()) {
        let oldAngVelMag = Math.abs(this.getBodyAngVel());
        if (oldAngVelMag && oldAngVelMag < PlayerSpirit.STOPPING_ANGVEL) {
          this.setBodyAngVel(0);
        }
        let oldVelMagSq = newVel.magnitudeSquared();
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
  let playerPos = this.getBodyPos();
  let targetPos = this.getTargetBody().getPosAtTime(this.now(), Vec2d.alloc());
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
    let dist = stick.getVal(this.vec2d).distance(this.destAim);
    this.aim.slideByFraction(this.destAim, Math.min(1, dist * 2));
  }
  this.aim.slideByFraction(this.destAim, 0.5).scaleToLength(1);
};


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness) {
  // up/down/left/right buttons
  let dist = 0;
  if (stickMag) {
    let correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
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
    let distContrib = dist * 0.25;
    let smoothContrib = 0.1 / (dist + 0.1);
    this.aim.slideByFraction(this.destAim, Math.min(1, smoothContrib + distContrib));
    this.aim.scaleToLength(1);
  }
};

PlayerSpirit.prototype.breakBeam = function() {
  if (BeamState.isOutputish(this.beamState)) {
    this.sounds.playerRelease(this.getBodyPos(), PlayerSpirit.GRAB_DIST / (PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD));
  }
  this.setBeamState(BeamState.OFF);
};


PlayerSpirit.prototype.handleSeeking = function() {
  let now = this.now();
  let maxScanDist = PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD;
  let maxFanAngle = PlayerSpirit.SEEKSCAN_FAN_ANGLE;

  let scanPos = Vec2d.alloc();
  let scanVel = Vec2d.alloc();

  let forceVec = Vec2d.alloc();
  let forcePos = Vec2d.alloc();

  let candidateRF = 2;
  let candidateBody = null;

  let unsuitableRF = 2;

  let self = this;

  function scan(leftFrac) {
    let rf = self.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
    let pulling = false;
    if (rf === -1) {
      // miss
    } else {
      let foundBody = self.getScanHitBody();
      if (foundBody) {
        // hit
        if (foundBody.mass === Infinity) {
          // unsuitable
          if (rf < unsuitableRF) {
            unsuitableRF = rf;
          }
        } else {
          // candidate
          if (rf < candidateRF) {
            candidateRF = rf;
            candidateBody = foundBody;
            self.seekTargetBodyId = foundBody.id;
          }
          // pull it closer
          forcePos.set(scanVel).scale(rf).add(scanPos).scale(0.1)
              .add(foundBody.getPosAtTime(now, self.vec2d)).scale(1 / (1 + 0.1));
          forceVec.set(scanVel).scaleToLength(-(1 - rf * 0.9) * PlayerSpirit.SEEKSCAN_FORCE);
          foundBody.applyForceAtWorldPosAndTime(forceVec, forcePos, now);

          // // Apply opposite force to player
          // self.getBody().applyForceAtWorldPosAndTime(forceVec.scale(-1), self.getBodyPos(), now);

          self.screen.addTractorSeekSplash(true, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD, rf);
          pulling = true;
        }
      }
    }
    if (!pulling) {
      self.screen.addTractorSeekSplash(false, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD, rf);
    }
  }

  // maybe direct a scan towards the last body we attracted
  let seekBody = this.getSeekTargetBody();
  if (seekBody) {
    let anglePaddingMult = 1.3;
    this.seekTargetBodyId = null;
    let angleDiffToSeekBody = this.getAngleDiff(this.getAngleToBody(seekBody));
    if (Math.abs(angleDiffToSeekBody) <= anglePaddingMult * maxFanAngle / 2) {
      let radUnit = angleDiffToSeekBody / maxFanAngle / 2;
      // set scanVel
      seekBody.getPosAtTime(now, scanVel)
          .subtract(this.getBodyPos())
          .scaleToLength(maxScanDist * (1 - radUnit * radUnit))
          .rot(2 * seekBody.rad * (Math.random() - 0.5) / maxScanDist);
      scanPos.set(this.getBodyPos());
      scan();
    }
  }

  // always fire a random scan
  let aimAngle = this.aim.angle();
  let radUnit = Math.random() - 0.5;
  scanPos.setXY(radUnit * this.getBody().rad, 0).rot(aimAngle).add(this.getBodyPos());
  scanVel.setXY(0, maxScanDist * (1 - radUnit * radUnit)).rot(radUnit * maxFanAngle + aimAngle);
  scan();

  this.seekHum.setWorldPos(this.getBodyPos());
  let minRf = Math.min(unsuitableRF + 0.5, candidateRF);
  this.seekHum.setDistanceFraction(minRf);
  if (candidateBody && candidateRF * maxScanDist <= PlayerSpirit.GRAB_DIST) {
    // grab that thing!
    this.targetBodyId = candidateBody.id;
    this.setBeamState(BeamState.WIELDING);
    this.sounds.playerGrab(this.getBodyPos(), PlayerSpirit.GRAB_DIST / (PlayerSpirit.SEEKSCAN_DIST + PlayerSpirit.PLAYER_RAD));
    this.screen.addGrabSplash(this.getBodyPos(), this.getAngleToTarget(), this.getTargetBody().rad);
  }
  scanPos.free();
  scanVel.free();
  forceVec.free();
  forcePos.free();
};

PlayerSpirit.prototype.setBeamState = function(newState) {
  if (this.beamState === newState) return;
  let target = this.getTargetSpirit();
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
      let newVal = newState === BeamState.ACTIVATING ? 1 : 0;
      if (newVal !== this.outputIdsToVals[target.id]) {
        this.outputIdsToVals[target.id] = newVal;
        target.onInputChanged(this.id, newVal);
      }
    }
  }

  if (newState === BeamState.SEEKING) {
    this.seekHum = new Sounds.PlayerSeekHum(this.sounds);
    this.seekHum.start();
  } else {
    this.seekTargetBodyId = null;
    if (this.seekHum) {
      this.seekHum.stop();
      this.seekHum = null;
    }
  }

  this.beamState = newState;
  if (this.beamState === BeamState.OFF) {
    this.targetBodyId = 0;
  }
};

PlayerSpirit.prototype.setOutputToTarget = function(val) {
  let target = this.getTargetSpirit();
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
  let playerBody = this.getBody();
  let targetBody = this.getTargetBody();
  let now = this.now();
  let playerPos = this.getBodyPos();
  let targetPos = targetBody.getPosAtTime(now, Vec2d.alloc());
  let targetRad = targetBody.shape === Body.Shape.CIRCLE ? targetBody.rad : 1;

  // break beam if there's something in the way for a length of time
  let scanVel = this.vec2d.set(targetPos).subtract(playerPos);
  let obstructionScanRad = 0.01;
  scanVel.scaleToLength(scanVel.magnitude() - targetRad - obstructionScanRad);
  let result = this.scanWithVel(HitGroups.PLAYER_SCAN, playerPos, scanVel, obstructionScanRad);
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
  let unobstructedness = 1 - this.obstructionCount / PlayerSpirit.MAX_OBSTRUCTION_COUNT;

  let deltaPos = Vec2d.alloc().set(targetPos).subtract(playerPos);
  let surfaceDist = deltaPos.magnitude() - playerBody.rad - targetRad;
  let p0 = surfaceDist - restingDist;

  let deltaVel = Vec2d.alloc().set(targetBody.vel).subtract(playerBody.vel);
  let v0 = this.vec2d2.set(deltaVel).dot(this.vec2d.set(deltaPos).scaleToLength(1));

  let maxA = maxAccel * unobstructedness * Math.abs(p0 * p0 / (restingDist * restingDist));
  let forceMagSum = 0;
  if (p0 >= breakDist) {
    this.breakBeam();
  } else {
    let playerForce = Vec2d.alloc();
    let targetForce = Vec2d.alloc();
    let playerForceProportion = 0.5;
    let pushAccelMag = Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
    let forceMag = targetBody.mass * pushAccelMag;
    targetForce.set(deltaPos).scaleToLength((1 - playerForceProportion) * forceMag);
    playerForce.set(deltaPos).scaleToLength((-playerForceProportion) * forceMag);

    if (isAngular) {
      p0 = deltaPos.angle() - restingAngle;
      while (p0 < -Math.PI) p0 += 2 * Math.PI;
      while (p0 > Math.PI) p0 -= 2 * Math.PI;
      maxA = maxAccel;
      p0 = Math.clip(p0, -Math.PI / 2, Math.PI / 2);
      v0 = this.vec2d2.set(deltaVel).dot(this.vec2d.set(deltaPos).scaleToLength(-1).rot90Right());
      let turnAccelMag = -Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
      let turnForceMag = Math.min(targetBody.mass, playerBody.mass) * turnAccelMag;
      targetForce.add(this.vec2d.set(deltaPos).rot90Right().scaleToLength((1 - playerForceProportion) * turnForceMag));
      playerForce.add(this.vec2d.set(deltaPos).rot90Right().scaleToLength(-playerForceProportion * turnForceMag));
    }
    forceMagSum = targetForce.magnitude() + playerForce.magnitude();
    if (forceMagSum > maxForce) {
      let scaleFactor = maxForce / forceMagSum;
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
  let playerBody = this.getBody();
  let targetBody = this.getTargetBody();
  let now = this.now();

  let p0 = targetBody.getAngPosAtTime(now) - restingAngle;
  while (p0 < -Math.PI) p0 += 2 * Math.PI;
  while (p0 > Math.PI) p0 -= 2 * Math.PI;

  // TODO actual target angular vel has to do with target/player pair orbit
  let v0 = targetBody.angVel - playerBody.angVel;

  // Limit the max acceleration for objects with high moments of inertia,
  // so the player can't spin them as if they are weightless.
  maxA = Math.min(maxA, maxA / targetBody.moi);
  let angPulse = Spring.getLandingAccel(p0, v0, maxA, PlayerSpirit.FRICTION_TIMEOUT);
  targetBody.addAngVelAtTime(angPulse, now);
};

PlayerSpirit.prototype.handleActivating = function() {
  this.handleWielding();
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  let body = this.getBody();
  if (!body) return;
  let bodyPos = this.getBodyPos();
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toShearZOpXY(-this.aim.x, -this.aim.y))
      .multiply(this.mat44.toRotateZOp(-body.getAngPosAtTime(this.now())));
  this.screen.drawModel(this.getModelId(), this.color, this.modelMatrix, null);

  let p1, p2, rad;

  // tractor beam
  let targetBody = this.getTargetBody();
  if (targetBody) {
    let unobstructedness = 1 - this.obstructionCount / PlayerSpirit.MAX_OBSTRUCTION_COUNT;
    this.aimColor.setRGBA(0, 1, 0);
    p1 = bodyPos;
    p2 = targetBody.getPosAtTime(this.now(), this.vec2d);
    let volume = 1/3 * PlayerSpirit.PLAYER_RAD * PlayerSpirit.WIELD_REST_DIST;
    rad = Math.min(body.rad * 0.5, targetBody.rad, unobstructedness * volume / this.getSurfaceDistToTarget());
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.modelMatrix2.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.screen.drawModel(ModelIds.LINE_SEGMENT, this.aimColor, this.modelMatrix, this.modelMatrix2);
  }

  // aim guide
  if (!targetBody) {
    this.aimColor.set(this.color).scale1(0.5 + Math.random() * 0.3);
    p1 = this.vec2d;
    p2 = this.vec2d2;
    let p1Dist = PlayerSpirit.PLAYER_RAD * 3.5;
    let p2Dist = PlayerSpirit.PLAYER_RAD * 2;
    rad = 0.15;
    p1.set(this.aim).scaleToLength(p1Dist).add(bodyPos);
    p2.set(this.aim).scaleToLength(p2Dist).add(bodyPos);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.modelMatrix2.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.screen.drawModel(ModelIds.LINE_SEGMENT, this.aimColor, this.modelMatrix, this.modelMatrix2);
  }
};

PlayerSpirit.prototype.getTargetBody = function() {
  let b = null;
  if (this.targetBodyId) {
    b = this.screen.getBodyById(this.targetBodyId);
  } else {
    this.targetBodyId = 0;
  }
  return b;
};

PlayerSpirit.prototype.getSeekTargetBody = function() {
  let b = null;
  if (this.seekTargetBodyId) {
    b = this.screen.getBodyById(this.seekTargetBodyId);
  } else {
    this.seekTargetBodyId = 0;
  }
  return b;
};

PlayerSpirit.prototype.getTargetSpirit = function() {
  return this.screen.getSpiritForBody(this.getTargetBody());
};

PlayerSpirit.prototype.explode = function() {
  let body = this.getBody();
  if (body) {
    let now = this.now();
    let pos = this.getBodyPos();
    let x = pos.x;
    let y = pos.y;

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
  let shots = 5;
  let angPos = this.destAim.angle();
  let scanPos = Vec2d.alloc().set(this.getBodyPos());
  let scanVel = Vec2d.alloc();
  let forceVec = Vec2d.alloc();
  let forcePos = Vec2d.alloc();
  for (let i = 0; i < shots; i++) {
    let forceMag = 0;
    let angle = angPos + spread * (i + 0.5) / shots - spread / 2;
    let dist = PlayerSpirit.KICK_DIST;
    scanVel.setXY(0, dist).rot(angle);
    let resultFraction = this.scanWithVel(HitGroups.PLAYER_SCAN, scanPos, scanVel, PlayerSpirit.SEEKSCAN_RAD);
    let splashed = false;
    if (resultFraction !== -1) {
      let foundBody = this.getScanHitBody();
      if (foundBody) {
        // Apply force at a mix of the contact point and the center of mass.
        let contactPointMix = 0.2;
        forcePos.set(scanVel).scale(resultFraction).scale(contactPointMix)
            .add(foundBody.getPosAtTime(this.now(), this.vec2d)).subtract(scanPos)
            .scale(1 / (1 + contactPointMix))
            .add(scanPos);
        // Force in the direction of the scan.
        forceVec.set(scanVel).scaleToLength(PlayerSpirit.KICK_FORCE);
        foundBody.applyForceAtWorldPosAndTime(forceVec, forcePos, this.now());
        this.screen.addKickHitSplash(scanPos, scanVel, resultFraction);
        splashed = true;
        forceMag += forceVec.magnitude();
      }
    }
    this.screen.sounds.playerKickHum(scanPos);
    if (forceMag) {
      this.screen.sounds.wallThump(forcePos, forceMag * 3);
    } else {
      this.screen.addKickMissSplash(scanPos, scanVel);
    }
  }
  scanVel.free();
  scanPos.free();
  forceVec.free();
  forcePos.free();
};

PlayerSpirit.prototype.die = function() {
  if (this.seekHum) {
    this.seekHum.stop();
    this.seekHum = null;
  }
  this.screen.killPlayerSpirit(this);
};
