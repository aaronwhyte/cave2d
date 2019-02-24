/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game6Key.PLAYER;
  this.team = Team.PLAYER;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();

  this.aim = new Vec2d(0, 1);
  this.weaponAim = new Vec2d();
  this.destAim = new Vec2d();

  this.toolButtonDown = false;

  this.lastHitMag = 0;
  this.lastHitTime = 0;

  this.accel = new Vec2d();
  this.keyMult = PlayerSpirit.KEY_MULT_ADJUST;

  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.vec2d = new Vec2d();
  this.stickVec = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.forceVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  this.flying = false;
  this.doLandingCheck = false;
  this.lastWallHitTime = -10;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 0.99;
PlayerSpirit.CAMERA_AIM_OFFSET = 3;
PlayerSpirit.CAMERA_VEL_MULTIPLIER = 2;
PlayerSpirit.CAMERA_VEL_OFFSET_MAX = 3;

PlayerSpirit.FLYING_TRACTION = 0.01;
PlayerSpirit.DRIVING_TRACTION = 0.5;
PlayerSpirit.THRUST = 1.3;

PlayerSpirit.ELASTICITY = 0.5;

PlayerSpirit.KEY_MULT_ADJUST = 1/10;
PlayerSpirit.MAX_KEYBOARD_DEST_AIM_ADJUSTMENT_ANGLE = Math.PI * 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 0.5;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.AIM_ANGPOS_ACCEL = Math.PI * 0.2;
PlayerSpirit.ANGULAR_FRICTION = 0.6;

PlayerSpirit.GRAVITY_ACCEL = 0.03;

PlayerSpirit.WALL_LANDING_TIME_THROTTLE = 1;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "lastFrictionTime",
  5: "aim"
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

PlayerSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new PlayerSpirit(screen);
  spirit.setColorRGB(1, 1, 1);

  let spiritId = world.addSpirit(spirit);
  let b = spirit.createBody(pos, dir);
  spirit.bodyId = world.addBody(b);

  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);

  let tool = new PlayerGun(screen);
  spirit.item = tool;
  screen.world.addSpirit(tool);
  tool.wield(spiritId);
  return spiritId;
};

PlayerSpirit.prototype.getModelId = function() {
  return ModelId.PLAYER_DRIVING;
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
  b.elasticity = PlayerSpirit.ELASTICITY;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.getCameraFocusPos = function() {
  return this.vec2d
      .set(this.getAimVec()).scaleToLength(this.flying ? 0 : PlayerSpirit.CAMERA_AIM_OFFSET)
      .add(this.vec2d2
          .set(this.getBodyVel())
          .scale(PlayerSpirit.CAMERA_VEL_MULTIPLIER)
          .clipToMaxLength(PlayerSpirit.CAMERA_VEL_OFFSET_MAX))
      .add(this.getBodyPos());
};

/**
 * @param {ControlMap} controlMap
 */
PlayerSpirit.prototype.handleInput = function(controlMap) {
  let playerBody = this.getBody();
  if (!playerBody) {
    return;
  }

  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }

  let now = this.now();
  this.lastInputTime = now;

  let stick = controlMap.getControl(ControlName.STICK);
  let touchlike = stick.isTouchlike();

  stick.getVal(this.stickVec);
  let stickMag = this.stickVec.magnitude();

  let tool = this.getSelectedTool();

  // process control event queue
  let e;
  while (e = controlMap.nextEvent()) {
    if (e.controlName === ControlName.ACTION_0) {
      this.toolButtonDown = e.bool;
      if (tool) {
        this.updateToolButton();
      }
    }
  }
  // Always release the fire button at this point.
  this.setToolButton(false);

  let thrust = PlayerSpirit.THRUST;

  // gradually ramp up key-based speed, for low-speed control.
  if (!touchlike) {
    // If there's stick movement, keyMult goes up. Otherwise it goes down, fast.
    if (stickMag) {
      this.keyMult += PlayerSpirit.KEY_MULT_ADJUST;
    } else {
      this.keyMult = PlayerSpirit.KEY_MULT_ADJUST;
    }
    // Max is 1, minimum is also the KEY_MULT_ADJUST constant.
    this.keyMult = Math.max(PlayerSpirit.KEY_MULT_ADJUST, Math.min(1, this.keyMult));
    thrust *= this.keyMult;
  }

  // Rayscan to find out how close we are to the ground and how to rotate to keep facing it.
  let bodyPos = this.getBodyPos();
  let bodyRad = this.getBody().rad;
  let bodyAngle = this.getBodyAngPos();
  let groundCount = 0;
  let angAccel = 0;
  this.accel.reset();
  if (!this.flying || this.doLandingCheck) {
    this.doLandingCheck = false;
    let scansPerSide = 2;
    let scanRad = bodyRad * 0.9;
    for (let i = -scansPerSide; i <= scansPerSide; i++) {
      let ang = Math.PI / 4 * i / scansPerSide;
      let scanPos = this.vec2d.setXY(i * (bodyRad - scanRad) / scansPerSide, 0).rot(ang + bodyAngle).add(bodyPos);
      let scanVel = this.vec2d2.setXY(0, bodyRad * 3 - scanRad).rot(ang);

      scanVel.rot(bodyAngle);
      let distFrac = this.screen.scan(
          HitGroups.WALL_SCAN,
          scanPos,
          scanVel,
          scanRad,
          this.scanResp);
      if (distFrac >= 0) {
        groundCount++;
        let pushFactor = 5 * (Math.min(distFrac, 1) - 0.55);
        this.accel.add(scanVel.scale(pushFactor / (scansPerSide * 2 + 1) / playerBody.mass));
      }
      if (distFrac < 0) distFrac = 1;
      let turnFactor = 1.5;
      angAccel += turnFactor * ang * (2 - distFrac) / (scansPerSide * 2 + 1);
    }

    this.flying = groundCount === 0;
    if (!this.flying) {
      // The accel represents only the ground-scan results at this point.
      // Now is the time to do some spring damping.
      this.vec2d.set(this.getBodyVel()).projectOnto(this.accel).scale(-0.2);
      this.accel.add(this.vec2d);
    }
  }

  let traction;
  if (this.flying) {
    traction = PlayerSpirit.FLYING_TRACTION;
    // gravity
    let dg = this.screen.distGrid;
    let px = dg.getPixelAtWorldVec(this.getBodyPos());
    let maxGravDist = dg.maxFillDist * dg.pixelSize; //15;
    if (px) {
      let dist = px.pixelDist * dg.pixelSize;
      if (dist <= maxGravDist) {
        let gravFrac = (maxGravDist - dist) / maxGravDist;
        px.getPixelToGround(this.vec2d).scaleToLength(PlayerSpirit.GRAVITY_ACCEL * gravFrac);
        this.accel.add(this.vec2d);
      }
    }
    // flying aim
    if (touchlike) {
      this.handleTouchlikeAim(stick, stickMag, 0);
    } else {
      this.handleKeyboardAim(stick, stickMag, 0, true);
    }
  } else {
    traction = PlayerSpirit.DRIVING_TRACTION;
    this.destAim.setXY(0, 1).rot(this.getBodyAngPos());
    this.aim.set(this.destAim);
  }
  this.accel.add(this.vec2d.set(playerBody.vel).scale(-traction));
  this.stickVec.scale(thrust * traction);
  this.accel.add(this.stickVec);
  playerBody.addAngVelAtTime(angAccel, now);
  playerBody.addVelAtTime(this.accel, now);
};

PlayerSpirit.prototype.getSelectedTool = function() {
  return this.item;
};

PlayerSpirit.prototype.updateToolButton = function() {
  this.setToolButton(this.toolButtonDown);
  if (this.flying) {
    this.setToolButton(false);
  }
};

PlayerSpirit.prototype.setToolButton = function(b) {
  let tool = this.getSelectedTool();
  if (tool) {
    tool.setButtonDown(b);
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
      if (this.flying) {
        let destAngle = this.aim.angle();
        let currAngle = this.getBodyAngPos();
        let curr2dest = destAngle - currAngle;
        while (curr2dest > Math.PI) {
          curr2dest -= 2 * Math.PI;
        }
        while (curr2dest < -Math.PI) {
          curr2dest += 2 * Math.PI;
        }
        let angAccel = Spring.getLandingAccel(
            -curr2dest, this.getBodyAngVel(), PlayerSpirit.AIM_ANGPOS_ACCEL, PlayerSpirit.FRICTION_TIMEOUT * 1.5);
        this.addBodyAngVel(angAccel);
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


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness, aimOnly) {
  if ((stickMag && !aimOnly) || reverseness > 0.99) {
    // instant aim
    stick.getVal(this.destAim);
    this.destAim.scaleToLength(1);
    this.aim.set(this.destAim);
  } else if (stickMag) {
    // gradual aim
    stick.getVal(this.destAim);
    let destAimAngle = this.destAim.angle();
    let aimAngle = this.aim.angle();

    let angleDiff = destAimAngle - aimAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    let maxMag = PlayerSpirit.MAX_KEYBOARD_DEST_AIM_ADJUSTMENT_ANGLE * this.keyMult;
    if (Math.abs(angleDiff) > maxMag) {
      angleDiff = Math.sign(angleDiff) * maxMag;
    }
    this.aim.rot(angleDiff).scaleToLength(1);
  } else {
    this.destAim.set(this.aim);
  }
};

PlayerSpirit.prototype.onDraw = function() {
  let body = this.getBody();
  if (!body) return;
  
  let now = this.now();

  let bodyPos = this.getBodyPos();
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toRotateZOp(-body.getAngPosAtTime(now)));
  this.screen.drawModel(this.getModelId(), this.color, this.modelMatrix, null);
};

PlayerSpirit.prototype.explode = function() {
  let pos = this.getBodyPos();
  this.sounds.playerExplode(pos);
  this.screen.splashes.addPlayerExplosionSplash(this.now(), pos, this.color);
};

PlayerSpirit.prototype.die = function() {
  this.explode();
  this.screen.removeSpiritFromSlot(this);

  let tool = this.getSelectedTool();
  if (tool) {
    tool.die();
  }
  this.screen.removeByBodyId(this.bodyId);
};

PlayerSpirit.prototype.onBeforeHitWall = function(collisionVec) {
  if (this.flying) {
    this.doLandingCheck = true;
  }
  if (this.flying || this.lastWallHitTime + PlayerSpirit.WALL_LANDING_TIME_THROTTLE < this.now()) {
    this.setBodyAngPos(this.getBodyVel().angle());
  }
  this.lastWallHitTime = this.now();
};

PlayerSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? Game6PlayScreen.FRICTION : 0.3;
};

PlayerSpirit.prototype.getAimVec = function() {
  return this.weaponAim.set(this.aim).scale(-1);
};
