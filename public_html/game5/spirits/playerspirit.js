/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5BaseScreen.SpiritType.PLAYER;
  this.team = Team.PLAYER;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.aimColor = new Vec4();

  this.aim = new Vec2d(0, 1);
  this.destAim = new Vec2d();

  this.accel = new Vec2d();
  this.keyMult = 0.25;

  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.vec2d = new Vec2d();
  this.stickVec = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  // combat
  this.toughness = 3;
  this.damage = 1;

  this.inventory = new Inventory();
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.PLAYER_RAD = 0.99;

PlayerSpirit.SPEED = 1.1;
PlayerSpirit.TRACTION = 0.2;

PlayerSpirit.KEY_MULT_ADJUST = 1/3;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.AIM_ANGPOS_ACCEL = 0.1;
PlayerSpirit.ANGULAR_FRICTION = 0.3;

PlayerSpirit.STOP_FIRING_AFTER_TIME = 10;

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

  // let w = new PlayerGun(screen);
  // world.addSpirit(w);
  // w.setWielderId(spiritId);
  // spirit.weapon = w;

  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);
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
  b.elasticity = 0.25;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.getCameraFocusPos = function() {
  return this.vec2d.set(this.aim).scaleToLength(PlayerSpirit.PLAYER_RAD * 3).add(this.getBodyPos());
};

/**
 *
 * @param {Controls} controls
 */
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
  stick.getVal(this.stickVec);
  let stickMag = this.stickVec.magnitude();

  // Only shoot if the player moved/aimed recently
  if (stickMag > 0.001) {
    this.lastStickVecTime = now;
  }
  if (this.weapon) {
    this.weapon.setButtonDown(now - this.lastStickVecTime < PlayerSpirit.STOP_FIRING_AFTER_TIME);
  }

  let stickDotAim = stickMag ? this.stickVec.dot(this.aim) / stickMag : 0; // aim is always length 1
  let speed = PlayerSpirit.SPEED;

  // gradually ramp up key-based speed, for low-speed control.
  if (!touchlike) {
    this.keyMult += PlayerSpirit.KEY_MULT_ADJUST * (stickMag ? 1 : -2);
    this.keyMult = Math.max(PlayerSpirit.KEY_MULT_ADJUST, Math.min(1, this.keyMult));
    speed *= this.keyMult * this.keyMult;
  }

  let traction = PlayerSpirit.TRACTION;
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
    this.handleKeyboardAim(stick, stickMag, reverseness);
  }
};

PlayerSpirit.prototype.getAimVec = function() {
  return this.aim;
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
      let aimAngle = this.destAim.angle();
      let angleDiff = aimAngle - this.getBodyAngPos();
      while (angleDiff > Math.PI) {
        angleDiff -= 2 * Math.PI;
      }
      while (angleDiff < -Math.PI) {
        angleDiff += 2 * Math.PI;
      }
      this.addBodyAngVel(duration * PlayerSpirit.AIM_ANGPOS_ACCEL * angleDiff);

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


PlayerSpirit.prototype.handleKeyboardAim = function(stick, stickMag, reverseness) {
  // up/down/left/right buttons
  let dist = 0;
  if (stickMag) {
    let correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
    dist = correction.magnitude();
    this.destAim.add(correction.scale(0.5 * Math.min(1, this.keyMult * this.keyMult)));
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

  // aim guide
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
  this.screen.drawModel(ModelId.LINE_SEGMENT, this.aimColor, this.modelMatrix, this.modelMatrix2);
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
  if (this.weapon) {
    this.screen.removeSpiritId(this.weapon.id);
  }
};

PlayerSpirit.prototype.die = function() {
  this.screen.killPlayerSpirit(this);
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
PlayerSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  if (otherBody.hitGroup === HitGroups.ITEM) {
    // collect the item
    let item = otherSpirit.getItem();
    if (item) {
      if (this.inventory.size()) {
        this.inventory.get(0).onUnSelect();
      }
      this.inventory.add(item);
      item.onPickup(this.screen, this);
      item.onSelect();
      if (item.tool) {
        // TODO: pull this out to another function
        this.screen.world.addSpirit(item.tool);
        item.tool.setWielderId(this.id);
        this.weapon = item.tool;
      }
    }
    this.screen.removeByBodyId(otherBody.id);
  } else {
    // regular collision
    BaseSpirit.prototype.onHitOther.apply(this, arguments);
  }
};
