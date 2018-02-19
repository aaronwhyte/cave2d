/**
 * @constructor
 * @extends {BaseSpirit}
 */
function AntSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.ANT;
  this.team = Team.ENEMY;

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
  this.stress = 0;

  this.lastControlTime = this.now();
  this.distOutsideViewCircles = 0;

  this.toughness = 1;
  this.damage = 1;

  // These represent the futuremost times for each timeout.
  this.nextActiveTime = -1;
  this.nextPassiveTime = -1;
}
AntSpirit.prototype = new BaseSpirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.ACTIVE_TIMEOUT = 3;
AntSpirit.PASSIVE_TIMEOUT = 300;

AntSpirit.THRUST = 0.5;
AntSpirit.TRACTION = 0.4;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.STOPPING_ANGVEL = 0.01;

// This many rads away from a player view bubble, an active ant can go to sleep.
AntSpirit.SLEEP_RADS = 10;

// This many rads away from a player view bubble, a sleeping ant can wake up.
AntSpirit.WAKE_RADS = 5;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "stress",
  5: "health",
  6: "lastControlTime"
};

AntSpirit.getJsoner = function() {
  if (!AntSpirit.jsoner) {
    AntSpirit.jsoner = new Jsoner(AntSpirit.SCHEMA);
  }
  return AntSpirit.jsoner;
};

AntSpirit.prototype.toJSON = function() {
  return AntSpirit.getJsoner().toJSON(this);
};

AntSpirit.prototype.setFromJSON = function(json) {
  AntSpirit.getJsoner().setFromJSON(json, this);
};

AntSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new AntSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.2;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.95;
  b.hitGroup = screen.getHitGroups().ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.scheduleActiveTimeout(spirit.now());
  spirit.schedulePassiveTimeout(spirit.now());
  return spiritId;
};

AntSpirit.prototype.scheduleActiveTimeout = function(time) {
  if (this.nextActiveTime < time) {
    if (this.changeListener) {
      this.changeListener.onBeforeSpiritChange(this);
    }
    this.screen.world.addTimeout(time, this.id, BaseSpirit.ACTIVE_TIMEOUT_VAL);
    this.nextActiveTime = time;
  }
};

AntSpirit.prototype.schedulePassiveTimeout = function(time) {
  if (this.nextPassiveTime < time) {
    if (this.changeListener) {
      this.changeListener.onBeforeSpiritChange(this);
    }
    this.screen.world.addTimeout(time, this.id, BaseSpirit.PASSIVE_TIMEOUT_VAL);
    this.nextPassiveTime = time;
  }
};

AntSpirit.prototype.getModelId = function() {
  return ModelIds.ANT;
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  let angle = this.getBodyAngPos() + rot;
  return this.screen.scan(
      this.screen.getHitGroups().ENEMY_SCAN,
      pos,
      this.scanVec.setXY(
          Math.sin(angle) * dist,
          Math.cos(angle) * dist),
      rad,
      this.scanResp);
};

AntSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  if (timeoutVal === BaseSpirit.ACTIVE_TIMEOUT_VAL) {
    if (this.now() === this.nextActiveTime) {
      this.doActiveTimeout();
    }
  } else if (timeoutVal === BaseSpirit.PASSIVE_TIMEOUT_VAL) {
    if (this.now() === this.nextPassiveTime) {
      this.doPassiveTimeout();
    }
  } else if (timeoutVal === -1) {
    // This is an old timeout from  before the passive/active biz.
    // Ignore it, but start the new-style timeouts.
    this.scheduleActiveTimeout(this.now() + AntSpirit.ACTIVE_TIMEOUT * Math.random());
    this.schedulePassiveTimeout(this.now() + AntSpirit.PASSIVE_TIMEOUT * Math.random());
  }
};

AntSpirit.prototype.doActiveTimeout = function(world) {
  this.stress = this.stress || 0;
  if (!this.screen.isPlaying()) {
    this.doEditorActiveTimeout();
  } else {
    this.doPlayingActiveTimeout();
  }
};

AntSpirit.prototype.doEditorActiveTimeout = function() {
  let now = this.now();
  let time = Math.max(0, Math.min(AntSpirit.ACTIVE_TIMEOUT, now - this.lastControlTime));
  let body = this.getBody();
  let friction = this.getFriction();
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);
  this.maybeStop();

  let timeoutDuration = AntSpirit.ACTIVE_TIMEOUT * (0.9 + 0.2 * Math.random());
  body.pathDurationMax = timeoutDuration * 1.01;
  body.invalidatePath();
  this.scheduleActiveTimeout(now + timeoutDuration);
};

AntSpirit.prototype.doPlayingActiveTimeout = function() {
  let now = this.now();
  let time = Math.max(0, Math.min(AntSpirit.ACTIVE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  let body = this.getBody();
  this.distOutsideViewCircles = this.screen.distOutsideViewCircles(this.getBodyPos());

  if (this.distOutsideViewCircles < body.rad * AntSpirit.SLEEP_RADS) {
    // normal active biz
    let friction = this.getFriction();
    body.applyLinearFrictionAtTime(friction * time, now);
    let newVel = this.vec2d.set(body.vel);

    this.handleLoner(newVel, time);

    let timeoutDuration = AntSpirit.ACTIVE_TIMEOUT * (0.9 + 0.2 * Math.random());
    body.pathDurationMax = timeoutDuration * 1.01;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    this.scheduleActiveTimeout(now + timeoutDuration);

  } else {
    // brakes only
    let friction = this.getFriction();
    body.applyLinearFrictionAtTime(friction * time, now);
    body.applyAngularFrictionAtTime(friction * time, now);
    let stopped = this.maybeStop();
    if (stopped) {
      // Assume the next timeout will be the passive one.
      let timeoutDuration = this.nextPassiveTime - now;
      body.pathDurationMax = timeoutDuration * 1.01;
      body.invalidatePath();
      // Do not schedule another active timeout.
    } else {
      // keep braking
      let timeoutDuration = AntSpirit.ACTIVE_TIMEOUT * (0.9 + 0.2 * Math.random());
      body.pathDurationMax = timeoutDuration * 1.01;
      body.invalidatePath();
      this.scheduleActiveTimeout(now + timeoutDuration);
    }
  }
};

AntSpirit.prototype.doPassiveTimeout = function(world) {
  let timeoutDuration = AntSpirit.PASSIVE_TIMEOUT * (0.9 + 0.2 * Math.random());
  if (this.nextActiveTime < this.now()) {
    // There is no scheduled active time,
    // so the passive timeout loop is in charge of invalidating paths.
    let body = this.getBody();
    body.pathDurationMax = timeoutDuration * 1.01;
    body.invalidatePath();
  }
  this.schedulePassiveTimeout(this.now() + timeoutDuration);
};

AntSpirit.prototype.handleLoner = function(newVel, time) {
  let body = this.getBody();
  let pos = this.getBodyPos();
  let now = this.now();
  let traction = AntSpirit.TRACTION;
  let scanDist = 3 * body.rad;
  let distFrac, scanRot;
  let moreStress = 0.2;

  let bestFrac = 0; // lowest possible value
  let bestRot = 0;

  let maxIterations = 8;
  if (this.stress >= 1) {
    // This stressed-out loner doesn't get any extra scan cycles
    maxIterations = 0;
    // freak out a little instead
    body.addAngVelAtTime(0.5 * (Math.random() - 0.5), now);
  }
  // How far (to either side) to look for a way out.
  let maxScanRotation = Math.PI * 0.99;

  // Randomly pick a starting side for every pair of side-scans.
  let lastSign = Math.sign(Math.random() - 0.5);
  for (let i = 0; i <= maxIterations; i++) {
    if (i === 0) {
      distFrac = this.scan(pos, 0, scanDist, body.rad);
      if (distFrac < 0) {
        bestFrac = 1;
      } else {
        // hit something
        bestFrac = distFrac;
      }
    } else {
      // Do a pair of scans to either side, in random order
      for (let signMult = -1; signMult <= 1; signMult += 2) {
        scanRot = signMult * lastSign * maxScanRotation * i / maxIterations;
        distFrac = this.scan(pos, scanRot, scanDist, body.rad);
        if (distFrac < 0) {
          bestFrac = 1;
          bestRot = scanRot;
        } else {
          // hit something
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
  let clip = 0.7;
  let angAccel = Math.clip(bestRot * bestFrac * 0.2, -clip, clip);
  body.addAngVelAtTime(angAccel, now);
  if (!this.stress) {
    // wander a little
    body.addAngVelAtTime(0.1 * (Math.random() - 0.5), now);
  }

  // and push
  let thrust = AntSpirit.THRUST * (0.5 * (1 - this.stress) + 0.5 * bestFrac);
  let dir = this.getBodyAngPos();
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
    // get stressed
    this.stress = Math.min(1, this.stress + moreStress * 0.2);
  }
};

AntSpirit.prototype.explode = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.screen.addEnemyExplosion(pos, body.rad, this.vec4.setXYZ(1, 1, 1));
  this.screen.sounds.antExplode(pos);

  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

AntSpirit.prototype.die = function() {
  this.explode();
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
AntSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  this.maybeWake();
  //this.screen.sounds.wallThump(this.getBodyPos(), mag / body.mass);
};

AntSpirit.prototype.maybeWake = function() {
  if (this.nextActiveTime < this.now()) {
    this.scheduleActiveTimeout(this.now());
  }
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  if (this.distOutsideViewCircles < this.getBody().rad * AntSpirit.WAKE_RADS) {
    this.maybeWake();
  }
};

