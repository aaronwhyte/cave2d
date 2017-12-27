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
  this.viewportsFromCamera = 0;

  this.toughness = 1;
  this.damage = 1;
}
AntSpirit.prototype = new BaseSpirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 2.8;
AntSpirit.THRUST = 0.8;
AntSpirit.TRACTION = 0.4;
AntSpirit.MAX_TIMEOUT = 30;
AntSpirit.LOW_POWER_VIEWPORTS_AWAY = 1.2;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.STOPPING_ANGVEL = 0.01;

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

AntSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

AntSpirit.createModel = function() {
  return RigidModel.createCircle(8)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
      .setColorRGB(0.1, 0.8, 0.1);
};

AntSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new AntSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
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

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  var angle = this.getBodyAngPos() + rot;
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
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.stress = this.stress || 0;

  var friction = this.getFriction();

  var now = this.now();
  var time = Math.max(0, Math.min(AntSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);

  var newVel = this.vec2d.set(body.vel);

  var oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < AntSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  var oldVelMagSq = newVel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < AntSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  if (this.screen.isPlaying()) {
    if (this.viewportsFromCamera < AntSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      this.handleLoner(newVel, time);
    }
  } else {
    body.applyAngularFrictionAtTime(friction * time, now);
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  timeoutDuration = Math.min(
      AntSpirit.MAX_TIMEOUT,
      AntSpirit.MEASURE_TIMEOUT * (0.2 * Math.random() + 0.9));
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};


AntSpirit.prototype.handleLoner = function(newVel, time) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var now = this.now();
  var traction = AntSpirit.TRACTION;
  var scanDist = 3 * body.rad;
  var distFrac, scanRot;
  var moreStress = 0.04;

  var bestFrac = 0; // lowest possible value
  var bestRot = 0;

  var maxIterations = 8;
  if (this.stress >= 1 ) {
    // This stressed-out loner doesn't get any extra scan cycles
    maxIterations = 0;
    // freak out a little instead
    body.addAngVelAtTime(0.2 * (Math.random() - 0.5), now);
  }
  // How far (to either side) to look for a way out.
  var maxScanRotation = Math.PI * 0.99;

  // Randomly pick a starting side for every pair of side-scans.
  var lastSign = Math.sign(Math.random() - 0.5);
  for (var i = 0; i <= maxIterations; i++) {
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
      for (var signMult = -1; signMult <= 1; signMult += 2) {
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
  var clip = 0.7;
  var angAccel = Math.clip(bestRot * bestFrac * (1 - this.stress) * 0.3, -clip, clip);
  body.addAngVelAtTime(angAccel, now);
  if (!this.stress) {
    body.addAngVelAtTime(0.1 * (Math.random() - 0.5), now);
  }

  // and push
  var thrust = AntSpirit.THRUST * (0.5 * (1 - this.stress) + 0.5 * bestFrac);
  var dir = this.getBodyAngPos();
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
    var joinable = this.joinableAfterTime < this.now();
    // less stress if unjoinable
    this.stress = Math.min(1, this.stress + moreStress * (joinable ? 1 : 0.2));
  }
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

AntSpirit.prototype.explode = function() {
  var body = this.getBody();
  var pos = this.getBodyPos();
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
  // Override me!
  var body = this.getBody();
  if (!body) return;
  //this.screen.sounds.wallThump(this.getBodyPos(), mag / body.mass);
};
