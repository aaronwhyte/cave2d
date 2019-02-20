/**
 * @constructor
 * @extends {Spirit}
 */
function BaseSpirit(screen) {
  Spirit.call(this);

  this.type = -1;

  this.tempBodyPos = new Vec2d();
  this.tempAnglePos = new Vec2d();
  this.tempBodyVel = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();

  this.aimVec = new Vec2d();

  BaseSpirit.prototype.reset.call(this, screen);
}
BaseSpirit.prototype = new Spirit();
BaseSpirit.prototype.constructor = BaseSpirit;

BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME = 1;

BaseSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
BaseSpirit.STOPPING_ANGVEL = 0.01;

BaseSpirit.ACTIVE_TIMEOUT_VAL = 1000;
BaseSpirit.PASSIVE_TIMEOUT_VAL = 1001;

BaseSpirit.PASSIVE_TIMEOUT = 1000;

BaseSpirit.PRE_UNSTUN_BLINK_TIME = 33;
BaseSpirit.PRE_UNSTUN_JIGGLE_TIME = 10;


/**
 * Returned by the default getActiveTimeout(), which van be overridden.
 * @type {number}
 */
BaseSpirit.ACTIVE_TIMEOUT = 1.5;

BaseSpirit.prototype.reset = function(screen) {
  this.screen = screen;
  this.lastControlTime = 0;

  // Violate Law of Demeter here :-/
  if (this.screen) {
    this.stamps = this.screen.stamps;
    this.sounds = this.screen.sounds;
  }

  this.bodyId = -1;
  this.id = -1;
  this.tempBodyPos.reset();

  this.lastThumpSoundTime = 0;

  // These represent the futuremost times for each timeout.
  this.nextActiveTime = -1;
  this.nextPassiveTime = -1;

  // Spirit is stunned until this time.
  this.stunUntil = -Infinity;

  this.team = null;
};

BaseSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

/**
 * @returns {boolean} true if the spirit's body exists and is completely stopped after the call.
 */
BaseSpirit.prototype.maybeStop = function() {
  let body = this.getBody();
  let angStopped = false;
  let linStopped = false;
  if (!body) {
    return false;
  } else {
    let oldAngVelMag = Math.abs(this.getBodyAngVel());
    if (!oldAngVelMag) {
      angStopped = true;
    } else if (oldAngVelMag < BaseSpirit.STOPPING_ANGVEL) {
      this.setBodyAngVel(0);
      angStopped = true;
    }
    let oldVelMagSq = body.vel.magnitudeSquared();
    if (!oldVelMagSq) {
      linStopped = true;
    } else if (oldVelMagSq < BaseSpirit.STOPPING_SPEED_SQUARED) {
      this.setBodyVel(Vec2d.ZERO);
      linStopped = true;
    }
  }
  return angStopped && linStopped;
};

/**
 * @param group
 * @param pos
 * @param dir
 * @param dist
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scan = function(group, pos, dir, dist, rad) {
  return this.screen.scan(
      group,
      pos,
      this.scanVec.setXY(
          Math.sin(dir) * dist,
          Math.cos(dir) * dist),
      rad,
      this.scanResp);
};

/**
 * @param group
 * @param pos
 * @param vel
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scanWithVel = function(group, pos, vel, rad) {
  return this.screen.scan(
      group,
      pos,
      vel,
      rad,
      this.scanResp);
};

BaseSpirit.prototype.getScanHitBody = function() {
  return this.screen.world.getBodyByPathId(this.scanResp.pathId);
};

BaseSpirit.prototype.getScanHitSpirit = function() {
  let body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

BaseSpirit.prototype.getBody = function() {
  return this.screen.world.bodies[this.bodyId];
};

BaseSpirit.prototype.getBodyPos = function() {
  let body = this.getBody();
  return body ? body.getPosAtTime(this.now(), this.tempBodyPos) : null;
};

BaseSpirit.prototype.getBodyVel = function() {
  let body = this.getBody();
  return body ? this.tempBodyVel.set(body.vel) : null;
};

BaseSpirit.prototype.setBodyVel = function(v) {
  let body = this.getBody();
  return body ? body.setVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.addBodyVel = function(v) {
  let body = this.getBody();
  return body ? body.addVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.getBodyAngPos = function() {
  let body = this.getBody();
  return body ? body.getAngPosAtTime(this.now()) : null;
};

BaseSpirit.prototype.setBodyAngPos = function(ap) {
  let body = this.getBody();
  if (body) {
    body.setAngPosAtTime(ap, this.now());
  }
};

BaseSpirit.prototype.getBodyAngVel = function() {
  let body = this.getBody();
  return body ? body.angVel : null;
};

BaseSpirit.prototype.setBodyAngVel = function(av) {
  let body = this.getBody();
  if (body) {
    return body.setAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.addBodyAngVel = function(av) {
  let body = this.getBody();
  if (body) {
    return body.addAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.now = function() {
  return this.screen.now();
};

BaseSpirit.prototype.addTimeout = function(time, spiritId, timeoutVal) {
  this.screen.world.addTimeout(time, spiritId, timeoutVal);
};

BaseSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? Game6PlayScreen.FRICTION : 0.3;
};

BaseSpirit.prototype.getAngleToBody = function(body) {
  let thisPos = this.getBodyPos();
  let thatPos = body.getPosAtTime(this.now(), this.tempAnglePos);
  let p = thatPos.subtract(thisPos);
  let angle = p.angle();
  return angle;
};

BaseSpirit.prototype.getAngleToPos = function(pos) {
  let thisPos = this.getBodyPos();
  let thatPos = this.tempAnglePos.set(pos);
  let p = thatPos.subtract(thisPos);
  let angle = p.angle();
  return angle;
};

BaseSpirit.prototype.getAngleDiff = function(toAngle) {
  let angleDiff = toAngle - this.getBodyAngPos();
  while (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  }
  while (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  return angleDiff;
};

/**
 * @override
 */
BaseSpirit.prototype.getColor = function() {
  let blinkStun = BaseSpirit.PRE_UNSTUN_BLINK_TIME;
  let s = this.getStun();
  let b = 1;
  if (!s) {
    return this.color.setRGBA(1, 1, 1, 1);
  } else if (s > blinkStun) {
    b = 0;
  } else {
    b = Math.max(0, (blinkStun - s) / blinkStun - Math.random());
  }
  let c = 0.6 + b;
  return this.color.setRGBA(c, c, c, 1);
};


BaseSpirit.prototype.getModelId = function() {
  return g6db.getModelId(this.type);
};

BaseSpirit.prototype.drawBody = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.distOutsideVisibleWorld = this.screen.distOutsideVisibleWorld(pos);
  if (this.distOutsideVisibleWorld < 2 * body.rad) {
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    this.screen.drawModel(this.getModelId(), this.getColor(), this.modelMatrix);
  }
};

BaseSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
};

/////////////////
// Weapon stuff
/////////////////

BaseSpirit.prototype.getAimVec = function() {
  return this.aimVec.setXY(0, 1).rot(this.getBodyAngPos());
};

BaseSpirit.prototype.getFireHitGroupForTeam = function(team) {
  switch(team) {
    case Team.PLAYER:
      return HitGroups.PLAYER_FIRE;
    case Team.ENEMY:
      return HitGroups.ENEMY_FIRE;
    default:
      return HitGroups.NEUTRAL;
  }
};

BaseSpirit.prototype.getWideScanHitGroupForTeam = function(team) {
  switch(team) {
    case Team.PLAYER:
      return HitGroups.PLAYER_WIDE_SCAN;
    case Team.ENEMY:
      return HitGroups.ENEMY_WIDE_SCAN;
    default:
      return HitGroups.NEUTRAL; // TODO neutral_wide_scan?
  }
};


/////////////
// Timeouts
/////////////

BaseSpirit.prototype.scheduleActiveTimeout = function(time) {
  if (this.nextActiveTime < time) {
    if (this.changeListener) {
      this.changeListener.onBeforeSpiritChange(this);
    }
    this.screen.world.addTimeout(time, this.id, BaseSpirit.ACTIVE_TIMEOUT_VAL);
    this.nextActiveTime = time;
  }
};

BaseSpirit.prototype.schedulePassiveTimeout = function(time) {
  if (this.nextPassiveTime < time) {
    if (this.changeListener) {
      this.changeListener.onBeforeSpiritChange(this);
    }
    this.screen.world.addTimeout(time, this.id, BaseSpirit.PASSIVE_TIMEOUT_VAL);
    this.nextPassiveTime = time;
  }
};

BaseSpirit.prototype.doPassiveTimeout = function(world) {
  let timeoutDuration = BaseSpirit.PASSIVE_TIMEOUT * (0.9 + 0.1 * Math.random());
  if (this.nextActiveTime < this.now()) {
    // There is no scheduled active time,
    // so the passive timeout loop is in charge of invalidating paths.
    let body = this.getBody();
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
  }
  this.schedulePassiveTimeout(this.now() + timeoutDuration);
};

BaseSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  // Allow -1 timeouts because that's the initial value.
  // But after those fire, no dupes can be created.
  if (timeoutVal === BaseSpirit.ACTIVE_TIMEOUT_VAL) {
    if (this.now() === this.nextActiveTime || this.nextActiveTime === -1) {
      this.doActiveTimeout();
    // } else {
    //   console.log('dropping active timeout because now != nextActiveTime', this.now(), this.nextActiveTime);
    }
  } else if (timeoutVal === BaseSpirit.PASSIVE_TIMEOUT_VAL) {
    if (this.now() === this.nextPassiveTime || this.nextPassiveTime === -1) {
      this.doPassiveTimeout();
    // } else {
    //   console.log('dropping passive timeout because now != nextPassiveTime', this.now(), this.nextPassiveTime);
    }
  } else if (timeoutVal === -1) {
    // console.log('legacy timeout - schedule new active and passive timeouts');
    // This is an old timeout from  before the passive/active biz.
    // Ignore it, but start the new-style timeouts.
    this.scheduleActiveTimeout(this.now() + this.getActiveTimeout() * Math.random());
    this.schedulePassiveTimeout(this.now() + BaseSpirit.PASSIVE_TIMEOUT * Math.random());
  }
};

BaseSpirit.prototype.doActiveTimeout = function(world) {
  if (!this.screen.isPlaying()) {
    // editing
    this.doEditorActiveTimeout();
  } else {
    // playing
    this.doPlayingActiveTimeout();
  }
};

BaseSpirit.prototype.doEditorActiveTimeout = function() {
  let now = this.now();
  this.lastControlTime = this.lastControlTime || (this.now() - this.getActiveTimeout());
  let time = Math.max(0, Math.min(this.getActiveTimeout(), now - this.lastControlTime));
  let body = this.getBody();
  let friction = this.getFriction();
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);
  let stopped = this.maybeStop();
  if (stopped) {
    // Assume the next timeout will be the passive one.
    let timeoutDuration = BaseSpirit.PASSIVE_TIMEOUT;
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
    // Do not schedule another active timeout.
  } else {
    // keep braking
    let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
    this.scheduleActiveTimeout(now + timeoutDuration);
  }
};

/**
 * override me to make something neat happen
 */
BaseSpirit.prototype.doPlayingActiveTimeout = function() {
  this.doEditorActiveTimeout();
};

/**
 * override me to change the active timeout
 * @returns {number}
 */
BaseSpirit.prototype.getActiveTimeout = function() {
  return BaseSpirit.ACTIVE_TIMEOUT;
};

BaseSpirit.prototype.maybeWake = function() {
  this.scheduleActiveTimeout(this.now());
};

BaseSpirit.prototype.startTimeouts = function() {
  this.scheduleActiveTimeout(this.now());
  this.schedulePassiveTimeout(this.now() + BaseSpirit.PASSIVE_TIMEOUT * Math.random());
};

/**
 * @param {number} duration  the spirit will be stunned until this time from now. If already
 * stunned for longer, then this has no effect.
 */
BaseSpirit.prototype.stunForDuration = function(duration) {
  this.stunUntil = Math.max(this.stunUntil, this.now() + duration);
};

/**
 * @returns {number} remaining time this will be stunned. Zero means the spirit is no longer stunned.
 * Never returns a negative number.
 */
BaseSpirit.prototype.getStun = function() {
  return Math.max(0, this.stunUntil - this.now());
};

BaseSpirit.prototype.onBeforeHitWall = function(collisionVec) {
};

/**
 * Apply friction and acceleration, and schedule another active timeout.
 * Do not try to stop the active timeout.
 * @param friction
 */
BaseSpirit.prototype.activeFrictionAndAccel = function(friction) {
  let body = this.getBody();
  let now = this.now();
  body.applyLinearFrictionAtTime(friction, now);
  body.applyAngularFrictionAtTime(friction, now);
  let newVel = this.vec2d.set(this.getBodyVel());
  newVel.add(this.accel);
  let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
  body.pathDurationMax = timeoutDuration * 1.01;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  this.scheduleActiveTimeout(now + timeoutDuration);
};

/**
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 */
BaseSpirit.prototype.onAfterHitWall = function(collisionVec, mag) {
  let body = this.getBody();
  if (!body) return;
  this.grounded = false;
  let now = this.now();
  if (this.lastThumpSoundTime + BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME < this.now()) {
    this.screen.sounds.wallThump(this.getBodyPos(), mag);
  }
  this.lastThumpSoundTime = now;

  if (this.getStun()) {
    if (this.getStun() > BaseSpirit.PRE_UNSTUN_JIGGLE_TIME &&
        this.getBodyVel().magnitudeSquared() < Math.random() * Math.random()) {
      this.setBodyVel(Vec2d.ZERO);
      this.setBodyAngVel(0);
      this.grounded = true;
    }
  }
  this.maybeWake();
};

BaseSpirit.prototype.onAfterBounce = function(collisionVec, mag) {
  this.grounded = false;
  this.maybeWake();
};

/**
 * The spirit is stunned, so try to fall to the ground and lie there.
 * @param {DistGrid} dg
 * @param {DistPixel} px
 */
BaseSpirit.prototype.activeStunnedOnPixel = function(dg, px) {
  let friction = this.getFriction();
  let gravity = 0.07 * this.getActiveTimeout();

  let wakeFactor = Math.max(0, BaseSpirit.PRE_UNSTUN_JIGGLE_TIME - this.getStun())
      / BaseSpirit.PRE_UNSTUN_JIGGLE_TIME;

  if ((wakeFactor || !this.grounded) && px) {
    px.getPixelToGround(this.accel).scaleToLength(gravity);
    this.addBodyAngVel(0.5 * (Math.random() - 0.5) * wakeFactor);
  }
  this.activeFrictionAndAccel(friction, this.accel);
};

/**
 * Not on a distGrid pixel, to go to the last known one, or find one sort of nearby.
 * @param {DistGrid} dg
 */
BaseSpirit.prototype.activeOffPixel = function(dg) {
  if (this.nearbyPx) {
    // Body is off the DistGrid, but we know of a place that is on the grid, so head over there.
    dg.pixelToWorld(this.vec2d.setXY(this.nearbyPx.pixelX, this.nearbyPx.pixelY), this.vec2d);
    this.vec2d.subtract(this.getBodyPos()).scaleToLength(0.05);
    this.accel.add(this.vec2d);
  } else {
    // Never been on the DistGrid! Do cheap random scan for a DistGrid pixel, at increasing distances.
    this.pxScans++;
    this.vec2d.setXY(0, Math.random() * this.pxScans).rot(Math.random() * 2 * Math.PI);
    this.vec2d.add(this.getBodyPos());
    let px = dg.getPixelAtWorldVec(this.vec2d);
    if (px) {
      this.nearbyPx = px;
      this.pxScans = 0;
    }
  }
  this.activeFrictionAndAccel(this.getFriction(), this.accel);
};

/**
 * Slow down and try to stop. If stopped, don't schedule another active timeout - switch to passive.
 */
BaseSpirit.prototype.activeBrakesOnly = function() {
  let body = this.getBody();
  let now = this.now();
  if (this.weapon) {
    this.weapon.setButtonDown(false);
  }
  let friction = 0.5;
  body.applyLinearFrictionAtTime(friction, now);
  body.applyAngularFrictionAtTime(friction, now);
  let stopped = this.maybeStop();
  if (stopped) {
    // Assume the next timeout will be the passive one.
    let timeoutDuration = BaseSpirit.PASSIVE_TIMEOUT;
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
    // Do not schedule another active timeout.
  } else {
    // keep braking
    let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
    this.scheduleActiveTimeout(now + timeoutDuration);
  }
};

