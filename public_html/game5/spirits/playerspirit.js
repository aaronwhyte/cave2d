/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5Key.PLAYER;
  this.team = Team.PLAYER;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();
  this.shieldColor = new Vec4();

  this.aim = new Vec2d(0, 1);
  this.destAim = new Vec2d();

  this.shielded = false;
  this.toolButtonDown = false;

  this.lastDamage = 0;
  this.lastDamageTime = 0;
  this.lastShieldedDamage = 0;
  this.lastShieldedDamageTime = 0;
  this.lastHitMag = 0;
  this.lastHitTime = 0;
  this.boostSplashTime = 0;

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

  // combat
  this.toughness = 3;
  // this.damage = 1;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 0.99;

PlayerSpirit.SPEED = 1.5;

PlayerSpirit.TRACTION = 0.1;
PlayerSpirit.SHIELD_TRACTION = 0.01;

PlayerSpirit.NORMAL_ELASTICITY = 0.25;
PlayerSpirit.SHIELD_ELASTICTY = 0.99;
PlayerSpirit.SHIELD_ABSORPTION = 0.95;
PlayerSpirit.MAX_SHIELD_DAMAGE = 5;

PlayerSpirit.KEY_MULT_ADJUST = 1/10;
PlayerSpirit.MAX_KEYBOARD_DEST_AIM_ADJUSTMENT_ANGLE = Math.PI / 30;
PlayerSpirit.FRICTION_TIMEOUT = 0.5;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.AIM_ANGPOS_ACCEL = Math.PI * 0.2;
PlayerSpirit.ANGULAR_FRICTION = 0.01;

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

  let tb = new TractorBeam(screen);
  spirit.tractorBeam = tb;
  screen.world.addSpirit(tb);
  tb.wield(spiritId);
  return spiritId;
};

PlayerSpirit.prototype.getModelId = function() {
  return ModelId.PLAYER;
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
  b.elasticity = PlayerSpirit.NORMAL_ELASTICITY;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.getCameraFocusPos = function() {
  return this.vec2d.set(this.aim).scaleToLength(PlayerSpirit.PLAYER_RAD * 3).add(this.getBodyPos());
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
  let duration = now - this.lastInputTime;
  this.lastInputTime = now;

  let stick = controlMap.getControl(ControlName.STICK);
  let touchlike = stick.isTouchlike();
  stick.getVal(this.stickVec);
  let stickMag = this.stickVec.magnitude();

  let tool = this.getSelectedTool();

  // process control event queue
  let e;
  while (e = controlMap.nextEvent()) {
    if (e.controlName === ControlName.DROP_ITEM) {
      if (this.item) {
        if (e.bool) {
          this.dropItem(0.5, 0, 0);
        }
      } else {
        this.setShielded(e.bool);
        this.updateToolButton();
      }
    } else if (e.controlName === ControlName.ACTION_0) {
      this.toolButtonDown = e.bool;
      if (tool) {
        this.updateToolButton();
      }
    }
  }

  let stickDotAim = stickMag ? this.stickVec.dot(this.aim) / stickMag : 0; // aim is always length 1
  let speed = PlayerSpirit.SPEED;
  let shieldDamage = this.getShieldedDamageFaded();
  if (shieldDamage && !this.shielded) {
    speed += Math.min(PlayerSpirit.SPEED, 1 + shieldDamage / 2);
  }

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
    speed *= this.keyMult;
  }
  let action0 = controlMap.getControl(ControlName.ACTION_0).getVal();
  let action1 = false;//TODO controlMap.getControl(ControlName.ACTION_1).getVal();
  let aimOnly = action0 || action1;
  if (aimOnly) {
    speed = 0;
  }

  let traction = this.shielded ? PlayerSpirit.SHIELD_TRACTION : PlayerSpirit.TRACTION;
  // Half of traction's job is to stop you from sliding in the direction you're already going.
  this.accel.set(playerBody.vel).scale(-traction);

  // The other half of traction's job is to get you going where you want.
  // vec2d is the stick input right now.
  this.stickVec.scale(speed * traction);
  this.accel.add(this.stickVec);
  // this.accel.debugIfNaN();
  playerBody.addVelAtTime(this.accel, this.now());

  ////////
  // AIM
  let reverseness = Math.max(0, -stickDotAim);
  if (touchlike) {
    this.handleTouchlikeAim(stick, stickMag, reverseness);
  } else {
    this.handleKeyboardAim(stick, stickMag, reverseness, aimOnly);
  }
};

PlayerSpirit.prototype.getSelectedTool = function() {
  return this.item || this.tractorBeam;
};

PlayerSpirit.prototype.updateToolButton = function() {
  this.getSelectedTool().setButtonDown(this.toolButtonDown && !this.shielded);
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
      // Angle towards aim.
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
      .multiply(this.mat44.toShearZOpXY(-this.aim.x, -this.aim.y))
      .multiply(this.mat44.toRotateZOp(-body.getAngPosAtTime(now)));
  this.screen.drawModel(this.getModelId(), this.color, this.modelMatrix, null);

  let shieldDamage = this.getShieldedDamageFaded();
  let shieldColor = this.shieldColor.setRGBA(
      Math.max(0, Math.min(PlayerSpirit.MAX_SHIELD_DAMAGE, shieldDamage * 2 - 1) / PlayerSpirit.MAX_SHIELD_DAMAGE),
      Math.max(0, Math.min(1, 1 - shieldDamage)),
      1, 1);

  let p1, p2, rad;

  // aim guide
  this.aimColor.set(this.color).scale1(0.5 + Math.random() * 0.3);
  p1 = this.vec2d;
  p2 = this.vec2d2;
  let p1Dist = PlayerSpirit.PLAYER_RAD * 3.5;
  let p2Dist = PlayerSpirit.PLAYER_RAD * 2;
  rad = 0.4;
  p1.set(this.aim).scaleToLength(p1Dist).add(bodyPos);
  p2.set(this.aim).scaleToLength(p2Dist).add(bodyPos);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0.9))
      .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
  this.modelMatrix2.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0.9))
      .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
  this.screen.drawModel(ModelId.LINE_SEGMENT, this.aimColor, this.modelMatrix, this.modelMatrix2);

  // shield
  if (this.shielded || shieldDamage > 0) {
    this.updateShieldWarble();
    let r = Math.min(2, shieldDamage) + 1 - Math.abs(1 - (shieldDamage * 10) % 1);
    let rad = PlayerSpirit.PLAYER_RAD + r * 0.05;
    let rad2 = this.shielded ? PlayerSpirit.PLAYER_RAD * 1.3 + r * 0.2 : PlayerSpirit.PLAYER_RAD;
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.modelMatrix2.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0.9))
        .multiply(this.mat44.toScaleOpXYZ(rad2, rad2, 1));
    this.screen.drawModel(ModelId.TUBE_32, this.shieldColor, this.modelMatrix, this.modelMatrix2);
  }

  // shield boost
  if (!this.shielded && shieldDamage > 0 && now - this.boostSplashTime >= 2 - shieldDamage / PlayerSpirit.MAX_SHIELD_DAMAGE) {
    this.boostSplashTime = now;
    this.screen.splashes.addShieldBoostSplash(now, bodyPos, this.getBodyVel(), shieldDamage, shieldColor);
  }

  if (this.shieldWarble && !this.shielded && shieldDamage === 0) {
    this.shieldWarble.stop();
    this.shieldWarble = null;
  }
};

PlayerSpirit.prototype.explode = function() {
  if (this.item) {
    this.dropItem(0.5 + Math.random(), 2 * Math.PI * Math.random(), Math.random() - 0.5);
  } else {
    this.tractorBeam.unwield();
  }
  this.setShielded(false);
  if (this.shieldWarble) {
    this.shieldWarble.stop();
    this.shieldWarble = null;
  }
  let pos = this.getBodyPos();
  this.sounds.playerExplode(pos);
  this.screen.splashes.addPlayerExplosionSplash(this.now(), pos, this.color);
  this.screen.removeByBodyId(this.bodyId);
  this.screen.removeSpiritId(this.tractorBeam.id);
};

PlayerSpirit.prototype.die = function() {
  this.screen.killPlayerSpirit(this);
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {BaseSpirit} otherSpirit
 */
PlayerSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  if (!this.item && otherSpirit && otherSpirit.isItem && this.tractorBeam.buttonDown) {
    // collect the item
    let item = otherSpirit;
    this.screen.splashes.addGrabSplash(this.now(), this.getBodyPos(), this.getBody().rad, this.getBodyAngPos());
    item.disembody();
    this.item = item;
    item.wield(this.id);
    this.screen.sounds.getItem(this.getBodyPos());
    this.tractorBeam.unwield();
    this.setShielded(false);
  } else {
    // regular collision
    BaseSpirit.prototype.onHitOther.apply(this, arguments);
    this.lastHitTime = this.now();
    this.lastHitMag = mag;
  }
};

PlayerSpirit.prototype.dropItem = function(speed, opt_angleOffset, opt_angVelOffset) {
  if (!this.item) return;
  let angleOffset = opt_angleOffset || 0;
  let angVelOffset = opt_angVelOffset || 0;
  let item = this.item;
  this.item = null;
  let dir = this.getBodyAngPos();
  item.embody(this.getBodyPos(),
      this.getBodyVel(),
      dir + angleOffset,
      this.getBodyAngVel() + angVelOffset);

  let itemBody = item.getBody();
  let now = this.now();
  this.forceVec.setXY(0, speed * itemBody.mass).rot(dir);
  itemBody.applyForceAtTime(this.forceVec, now);
  this.getBody().applyForceAtTime(this.forceVec.scale(-1), now);

  this.tractorBeam.wield(this.id);

  this.screen.sounds.dropItem(this.getBodyPos());
};

PlayerSpirit.prototype.setShielded = function(s) {
  if (s === this.shielded) return;
  this.shielded = s;
  this.getBody().elasticity = s ? PlayerSpirit.SHIELD_ELASTICTY : PlayerSpirit.NORMAL_ELASTICITY;
  if (s && !this.shieldWarble) {
    this.shieldWarble = new Sounds.Warble(this.screen.sounds, 'square', 'sine');
    this.shieldWarble.start();
    this.updateShieldWarble();
  }
};

PlayerSpirit.prototype.updateShieldWarble = function() {
  let base = this.getShieldedDamageFaded() + (this.shielded ? this.getHitMagFaded() : 0);
  let d = Math.min(PlayerSpirit.MAX_SHIELD_DAMAGE, Math.sqrt(1 + base / (1 - PlayerSpirit.SHIELD_ABSORPTION)) - 1);
  this.shieldWarble.setGain(0.05 + Math.min(2, d / PlayerSpirit.MAX_SHIELD_DAMAGE));
  this.shieldWarble.setWorldPos(this.getBodyPos());
  let baseFreq = 80 - d * 9;
  this.shieldWarble.setPitchFreq(baseFreq);

  this.shieldWarble.setWubFreq(
      ((this.shielded ? 8 : (10 + this.getBodyVel().magnitude())) + d * 0.5) *
      baseFreq *
      (1 + 0.01 * (d + 0.01) * (Math.random() - 0.5)));
};

PlayerSpirit.prototype.applyDamage = function(d) {
  let absorb = this.shielded ? PlayerSpirit.SHIELD_ABSORPTION * d : 0;
  let damage = d - absorb;
  BaseSpirit.prototype.applyDamage.call(this, damage);
  this.lastDamage = damage + this.getDamageFaded();
  this.lastDamageTime = this.now();

  if (this.shielded) {
    this.lastShieldedDamage = Math.min(PlayerSpirit.MAX_SHIELD_DAMAGE, absorb + this.getShieldedDamageFaded());
    this.lastShieldedDamageTime = this.now();
  }
};

PlayerSpirit.prototype.getDamageFaded = function() {
  return Math.max(0, this.lastDamage - Math.pow(0.1 * (this.now() - this.lastDamageTime), 2));
};

PlayerSpirit.prototype.getShieldedDamageFaded = function() {
  return Math.max(0, this.lastShieldedDamage - Math.pow(0.1 * (this.now() - this.lastShieldedDamageTime), 2));
};

PlayerSpirit.prototype.getHitMagFaded = function() {
  return Math.max(0, Math.min(5, this.lastHitMag)/5 - Math.pow(0.5 * (this.now() - this.lastHitTime), 2));
};

PlayerSpirit.prototype.getFriction = function() {
  return this.shielded ? Game5PlayScreen.FRICTION * 0.05 : Game5PlayScreen.FRICTION;
};