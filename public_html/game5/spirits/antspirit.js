/**
 * @constructor
 * @extends {BaseSpirit}
 */
function AntSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game5BaseScreen.SpiritType.ANT;
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

  this.distOutsideViewCircles = 0;

  this.toughness = 1;
  this.damage = 0;
}
AntSpirit.prototype = new BaseSpirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.ACTIVE_TIMEOUT = 1.3;

AntSpirit.THRUST = 1.5;
AntSpirit.TRACTION = 0.2;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.STOPPING_ANGVEL = 0.01;

// This many rads away from a player view bubble, an active ant can go to sleep.
AntSpirit.SLEEP_RADS = 10;

// This many rads away from a player view bubble, a sleeping ant can wake up.
AntSpirit.WAKE_RADS = 2;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
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
  return spiritId;
};

/**
 * @override
 * @returns {number}
 */
AntSpirit.prototype.getActiveTimeout = function() {
  return AntSpirit.ACTIVE_TIMEOUT;
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

/**
 * @override
 */
AntSpirit.prototype.doPlayingActiveTimeout = function() {
  if (!this.weapon && this.screen.isPlaying()) {
    let w = new LaserWeapon(this.screen);
    this.screen.world.addSpirit(w);
    w.setWielderId(this.id);
    this.weapon = w;
  }

  this.stress = this.stress || 0;
  let now = this.now();
  let time = Math.max(0, Math.min(this.getActiveTimeout(), now - this.lastControlTime));
  this.lastControlTime = now;

  let body = this.getBody();
  this.distOutsideViewCircles = this.screen.distOutsideViewCircles(this.getBodyPos());
  // this.distOutsideViewCircles = this.screen.distFromViewCenter(this.getBodyPos()) - 5; // fun debugging

  if (this.distOutsideViewCircles < body.rad * AntSpirit.SLEEP_RADS) {
    // normal active biz
    if (this.weapon) {
      this.weapon.setButtonDown(true);
    }
    let friction = this.getFriction();
    body.applyLinearFrictionAtTime(friction * time, now);
    let newVel = this.vec2d.set(body.vel);

    this.handleLoner(newVel, time);

    let timeoutDuration = this.getActiveTimeout() * (0.9 + 0.1 * Math.random());
    body.pathDurationMax = timeoutDuration * 1.01;
    body.setVelAtTime(newVel, now);
    body.invalidatePath();
    this.scheduleActiveTimeout(now + timeoutDuration);

  } else {
    // brakes only
    if (this.weapon) {
      this.weapon.setButtonDown(false);
    }
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
  }
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
    body.addAngVelAtTime(0.7 * (Math.random() - 0.5), now);
  }
  // How far (to either side) to look for a way out.
  let maxScanRotation = Math.PI * 0.99;

  // Randomly pick a starting side for every pair of side-scans.
  let lastSign = Math.sign(Math.random() - 0.5);
  for (let i = 0; i <= maxIterations; i++) {
    if (i === 0) {
      distFrac = this.scan(pos, 0.5 * (Math.random() - 0.5), scanDist, body.rad);
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

  if (this.weapon) {
    this.screen.removeSpiritId(this.weapon.id);
  }
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

AntSpirit.prototype.die = function() {
  this.explode();
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  if (this.distOutsideViewCircles < this.getBody().rad * AntSpirit.WAKE_RADS) {
    this.maybeWake();
  }
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
AntSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  // let body = this.getBody();
  // if (!body) return;
  // let now = this.now();
  // if (this.lastThumpSoundTime + BaseSpirit.MIN_WALL_THUMP_SILENCE_TIME < this.now()) {
  //   this.screen.sounds.wallThump(this.getBodyPos(), mag);
  // }
  // this.lastThumpSoundTime = now;

  this.maybeWake();
};
