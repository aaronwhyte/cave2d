/**
 * Both head and body
 * @constructor
 * @extends {BaseSpirit}
 */
function CentipedeSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.CENTIPEDE;
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
  // When it hits 1, a centipede will break apart to get unstuck.
  this.stress = 0;
  this.joinableAfterTime = 0;

  this.lastControlTime = this.now();
  this.viewportsFromCamera = 0;

  this.headwardId = 0;
  this.tailwardId = 0;

  this.toughness = 2;
  this.damage = 1;
}
CentipedeSpirit.prototype = new BaseSpirit();
CentipedeSpirit.prototype.constructor = CentipedeSpirit;

CentipedeSpirit.MEASURE_TIMEOUT = 2.1;
CentipedeSpirit.REJOIN_TIMEOUT = 50;
CentipedeSpirit.THRUST = 0.8;
CentipedeSpirit.TRACTION = 0.5;
CentipedeSpirit.MAX_TIMEOUT = 10;
CentipedeSpirit.LOW_POWER_VIEWPORTS_AWAY = 3;
CentipedeSpirit.OPTIMIZE = true;

CentipedeSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "stress",
  5: "health",
  6: "lastControlTime",
  7: "headwardId",
  8: "tailwardId",
  9: "joinableAfterTime"
};

CentipedeSpirit.getJsoner = function() {
  if (!CentipedeSpirit.jsoner) {
    CentipedeSpirit.jsoner = new Jsoner(CentipedeSpirit.SCHEMA);
  }
  return CentipedeSpirit.jsoner;
};

CentipedeSpirit.prototype.toJSON = function() {
  return CentipedeSpirit.getJsoner().toJSON(this);
};

CentipedeSpirit.prototype.setFromJSON = function(json) {
  CentipedeSpirit.getJsoner().setFromJSON(json, this);
};

CentipedeSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new CentipedeSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.3;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 1.2;
  b.hitGroup = screen.getHitGroups().ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

CentipedeSpirit.prototype.getModelId = function() {
  return ModelIds.CENTIPEDE;
};

CentipedeSpirit.prototype.scan = function(pos, rot, dist, rad) {
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

CentipedeSpirit.prototype.getHeadwardSpirit = function() {
  let headward = null;
  if (this.headwardId) {
    headward = this.screen.getSpiritById(this.headwardId);
    if (!headward) {
      this.headwardId = 0;
    }
  }
  return headward;
};

CentipedeSpirit.prototype.getTailwardSpirit = function() {
  let tailward = null;
  if (this.tailwardId) {
    tailward = this.screen.getSpiritById(this.tailwardId);
    if (!tailward) {
      this.tailwardId = 0;
    }
  }
  return tailward;
};

/**
 * Finds the head, and then reverses the entire chain so the tail is the new head.
 */
CentipedeSpirit.prototype.reverseChain = function() {
  let scan = this.getHeadmostSpirit();
  let next;
  while (scan) {
    next = scan.getTailwardSpirit();
    let temp = scan.headwardId;
    scan.headwardId = scan.tailwardId;
    scan.tailwardId = temp;
    scan = next;
  }
  return this;
};

CentipedeSpirit.prototype.getHeadmostSpirit = function() {
  // find the head
  let head = this;
  let scan = head;
  while (scan = head.getHeadwardSpirit()) {
    head = scan;
  }
  return head;
};

CentipedeSpirit.prototype.findMipointSpirit = function() {
  let node = this;
  let halfNode = this;
  let halfStep = false;
  let nextNode;
  while (nextNode = node.getTailwardSpirit()) {
    node = nextNode;
    if (halfStep) {
      halfNode = halfNode.getTailwardSpirit();
      halfStep = false;
    } else {
      halfStep = true;
    }
  }
  return halfNode;
};

CentipedeSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  this.maybeStop();
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.stress = this.stress || 0;

  let friction = this.getFriction();

  let now = this.now();
  let time = Math.max(0, Math.min(CentipedeSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);

  let newVel = this.vec2d.set(body.vel);

  let headward = this.getHeadwardSpirit();
  let tailward = this.getTailwardSpirit();
  if (this.screen.isPlaying()) {
    this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
    if (!CentipedeSpirit.OPTIMIZE || this.viewportsFromCamera < CentipedeSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      if (headward) {
        // this is following somebody
        this.handleFollower(newVel, time, headward);
      } else if (tailward) {
        // this is the leader
        this.handleLeader(newVel, time);
      } else {
        // no head or tail. Consider joining a chain
        this.handleLoner(newVel, time);
      }
    }
  } else {
    body.applyAngularFrictionAtTime(friction * time, now);
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  let timeoutDuration;
  timeoutDuration = Math.min(
      CentipedeSpirit.MAX_TIMEOUT,
      CentipedeSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

CentipedeSpirit.prototype.handleFollower = function(newVel, time, headward) {
  let thisBody = this.getBody();
  let now = this.now();
  let traction = CentipedeSpirit.TRACTION;
  this.stress = 0;

  // Follow the headward spirit.
  let thatBody = headward.getBody();
  let thisPos = this.getBodyPos();
  let thatPos = thatBody.getPosAtTime(this.now(), Vec2d.alloc());

  let dist = thatPos.distance(thisPos);
  if (dist > thisBody.rad * 5) {
    // break!
    this.getHeadwardSpirit().breakOffTail();
  } else {
    // linear accel
    let p0 = dist - thisBody.rad * 1.05 - thatBody.rad;
    let deltaPos = Vec2d.alloc().set(thatPos).subtract(thisPos);
    let deltaVel = Vec2d.alloc().set(thatBody.vel).subtract(thisBody.vel);
    let v0 = deltaVel.dot(deltaPos.scaleToLength(1));
    let maxA = CentipedeSpirit.THRUST * 2;
    let accelMag = -Spring.getLandingAccel(p0, v0, maxA, CentipedeSpirit.MEASURE_TIMEOUT * 1.5);
    this.accel.setXY(0, 1).rot(this.getBodyAngPos()).scaleToLength(1).scale(accelMag);
    newVel.scale(1 - traction).add(this.accel.scale(traction));
    deltaPos.free();
    deltaVel.free();

    // angular accel
    let destAngle = this.getAngleToBody(thatBody);
    thisBody.applyAngularFrictionAtTime(0.5, now);
    let angAccel = this.getAngleDiff(destAngle) * 0.3;
    thisBody.addAngVelAtTime(angAccel, now);
  }
  thatPos.free();
};

CentipedeSpirit.prototype.handleLeader = function(newVel, time) {
  this.handleFront(newVel, time, true);
};

CentipedeSpirit.prototype.handleLoner = function(newVel, time) {
  this.handleFront(newVel, time, false);
};

CentipedeSpirit.prototype.getHeadId = function() {
  let node = this;
  let nextNode = null;
  while (nextNode = node.getHeadwardSpirit()) {
    node = nextNode;
  }
  return node.id;
};

CentipedeSpirit.prototype.handleFront = function(newVel, time, hasTail) {
  let body = this.getBody();
  let pos = this.getBodyPos();
  let now = this.now();
  let traction = CentipedeSpirit.TRACTION;
  let scanDist = 2.5 * body.rad;
  let distFrac, scanRot;
  let moreStress = 0.04;

  let bestFrac = 0; // lowest possible value
  let bestRot = 0;

  let maxIterations = 8;
  if (this.stress >= 1 && !this.tailwardId && Math.random() > 0.1) {
    // This stressed-out loner doesn't get any extra scan cycles
    maxIterations = 0;
    // freak out a little instead
    body.addAngVelAtTime(0.2 * (Math.random() - 0.5), now);
  }
  // How far (to either side) to look for a way out.
  let maxScanRotation = Math.PI * 0.9;

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
        this.maybeJoin();
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
          this.maybeJoin();
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
  let angAccel = Math.clip(bestRot * bestFrac * (1 - this.stress) * 0.3, -0.2, 0.2);
  body.addAngVelAtTime(angAccel, now);
  if (!this.stress) {
    body.addAngVelAtTime(0.1 * (Math.random() - 0.5), now);
  }

  // and push
  let thrust = CentipedeSpirit.THRUST * (0.5 * (1 - this.stress) + 0.5 * bestFrac);
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
    // get stressed?
    let joinable = this.joinableAfterTime < this.now();
    // less stress if unjoinable
    this.stress = Math.min(1, this.stress + moreStress * (joinable ? 1 : 0.2));
  }
  if (hasTail && this.stress >= 1) {
    let mid = this.findMipointSpirit();
    let midHead = mid.breakOffTail().reverseChain().getHeadmostSpirit();
    midHead.stress = 0;
    midHead.joinableAfterTime = this.now() + CentipedeSpirit.REJOIN_TIMEOUT;
    let thisHead = this.reverseChain().getHeadmostSpirit();
    thisHead.stress = 0;
    thisHead.joinableAfterTime = this.now() + CentipedeSpirit.REJOIN_TIMEOUT;
  }
};

CentipedeSpirit.prototype.breakOffTail = function() {
  let tailwardSpirit = this.getTailwardSpirit();
  if (tailwardSpirit) {
    tailwardSpirit.headwardId = 0;
    tailwardSpirit.stress = 1;
    this.tailwardId = 0;
  }
  return tailwardSpirit;
};

CentipedeSpirit.prototype.maybeJoin = function() {
  if (!this.stress && !this.headwardId && this.now() > this.joinableAfterTime) {
    let otherSpirit = this.getScanHitSpirit();
    if (otherSpirit &&
        otherSpirit.type === Game4BaseScreen.SpiritType.CENTIPEDE &&
        !otherSpirit.getTailwardSpirit() &&
        !otherSpirit.stress &&
        this.now() > otherSpirit.joinableAfterTime &&
        otherSpirit.getHeadId() !== this.id) {
      // Found a relaxed segment with out a tail. Join up!
      this.headwardId = otherSpirit.id;
      otherSpirit.tailwardId = this.id;
    }
  }
};

CentipedeSpirit.prototype.explode = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.screen.addEnemyExplosion(pos, body.rad, this.vec4.setXYZ(1, 1, 1));
  this.screen.sounds.antExplode(pos);

  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

CentipedeSpirit.prototype.die = function() {
  this.explode();
};

/**
 * Called after bouncing and damage exchange are done.
 * @param {Vec2d} collisionVec
 * @param {Number} mag the magnitude of the collision, kinda?
 * @param {Body} otherBody
 * @param {Spirit} otherSpirit
 */
CentipedeSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  // Override me!
  let body = this.getBody();
  if (!body) return;
  //this.screen.sounds.wallThump(this.getBodyPos(), mag / body.mass);
};
