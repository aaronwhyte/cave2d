/**
 * @constructor
 * @extends {Spirit}
 */
function AntSpirit(screen) {
  Spirit.call(this);
  this.screen = screen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = BaseScreen.SpiritType.ANT;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;

  this.tempBodyPos = new Vec2d();
  this.vecToPlayer = new Vec2d();
  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.accel = new Vec2d();
  this.stress = 0;

  this.lastControlTime = this.screen.now();
  this.viewportsFromCamera = 0;
  this.health = AntSpirit.MAX_HEALTH;
}
AntSpirit.prototype = new Spirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 1.2;
AntSpirit.THRUST = 0.3;
AntSpirit.MAX_TIMEOUT = 10;
AntSpirit.LOW_POWER_VIEWPORTS_AWAY = 2;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.MAX_HEALTH = 2;
AntSpirit.OPTIMIZE = true;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel",
  6: "stress",
  7: "health"
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
  return RigidModel.createCircleMesh(4)
      .setColorRGB(0.7, 0, 0)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)));
};

AntSpirit.factory = function(playScreen, stamp, pos, dir) {
  var world = playScreen.world;

  var spirit = new AntSpirit(playScreen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, world.now);
  b.rad = 0.8;
  b.hitGroup = BaseScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 1.1;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  return this.screen.scan(
      BaseScreen.Group.ROCK,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad,
      this.scanResp);
};

AntSpirit.prototype.turnToPlayer = function() {
  var toPlayer = this.vecToPlayer.set(this.screen.playerAveragePos).subtract(this.tempBodyPos);
  var right = this.vec2d2.setXY(1, 0).rot(this.dir);
  var dot = right.dot(toPlayer);
  this.angVel += 0.1 * dot / toPlayer.magnitude();
};

AntSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var body = this.getBody(world);
  var pos = body.getPosAtTime(world.now, this.tempBodyPos);
  this.stress = this.stress || 0;

  var friction = 0.05;
  var traction = 0.5;

  var now = this.screen.now();
  var time = Math.min(AntSpirit.MEASURE_TIMEOUT, now - this.lastControlTime);
  this.lastControlTime = now;

  var newVel = this.vec2d.set(body.vel);

  // friction
  this.accel.set(newVel).scale(-friction * time);
  newVel.add(this.accel);
  if (AntSpirit.OPTIMIZE && newVel.magnitudeSquared() < AntSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  if (this.screen.isPlaying()) {
    if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < AntSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      this.accel.set(body.vel).scale(-traction * time);
      newVel.add(this.accel);
      var antennaRotMag = Math.max(Math.PI * 0.13, Math.PI * this.stress);
      var scanDist = body.rad * (3 + (1 - this.stress));
      var scanRot = 2 * antennaRotMag * (Math.random() - 0.5);
      var dist = this.scan(pos, scanRot, scanDist, body.rad);
      var angAccel = 0;
      var thrust = AntSpirit.THRUST * (AntSpirit.MAX_HEALTH / this.health);
      if (dist >= 0) {
        // rayscan hit
        var otherSpirit = this.getScanHitSpirit();
        if (otherSpirit && otherSpirit.type == BaseScreen.SpiritType.PLAYER) {
          // attack player!
          this.stress = 0;
          angAccel = scanRot * 0.2;
          this.turnToPlayer();
          thrust *= 1.2;
        } else {
          // avoid obstruction
          angAccel = -scanRot * (this.stress * 0.8 + 0.2);
          this.stress += 0.03;
          thrust *= (dist - 0.05 * this.stress);
        }
      } else {
        // clear path
        if (this.stress > 0.5) {
          // escape!
          angAccel = 0;
          this.angVel = 0;
          this.dir += scanRot;
        } else {
          angAccel = scanRot * (this.stress * 0.8 + 0.2);
          this.turnToPlayer();
        }
        this.stress = 0;
      }
      this.stress = Math.min(1, Math.max(0, this.stress));

      this.angVel *= 0.5;
      this.angVel += angAccel;
      this.dir += this.angVel;

      this.accel.setXY(Math.sin(this.dir), Math.cos(this.dir))
          .scale(thrust * traction * time);
      newVel.add(this.accel);
    }
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  if (AntSpirit.OPTIMIZE) {
    timeoutDuration = Math.min(
        AntSpirit.MAX_TIMEOUT,
            (this.health/AntSpirit.MAX_HEALTH) * AntSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera));
  } else {
    timeoutDuration = AntSpirit.MEASURE_TIMEOUT * (1 - Math.random() * 0.05);
  }
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, world.now);
  world.addTimeout(world.now + timeoutDuration, this.id, -1);
};

AntSpirit.prototype.getScanHitSpirit = function() {
  var body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(this.tempBodyPos);
  if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.dir));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

AntSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};

AntSpirit.prototype.onPlayerBulletHit = function() {
  this.health--;
  if (this.health <= 0) {
    this.explode();
  }
};

AntSpirit.prototype.explode = function() {
  var body = this.getBody(this.screen.world);
  body.getPosAtTime(this.screen.now(), this.tempBodyPos);
  this.explosionSplash(this.tempBodyPos, body.rad * (3 + Math.random()));
  this.screen.soundKaboom(this.tempBodyPos);
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

AntSpirit.prototype.explosionSplash = function(pos, rad) {
  var s = this.screen.splash;
  s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.soundStamp);

  s.startTime = this.now();
  s.duration = 5 * (1 + rad);

  var x = pos.x;
  var y = pos.y;

  var endRad = rad * 3;

  s.startPose.pos.setXYZ(x, y, -0.5);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(rad/2, rad/2, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, -0.5);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(0, 0, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(1, 1, 1);
  s.endColor.setXYZ(0.2, 0.2, 0.2);

  this.screen.splasher.addCopy(s);

  s.duration *= 2;
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(0, 0, 1);

  s.startPose2.scale.setXYZ(0, 0, 1);
  s.endPose2.scale.setXYZ(0, 0, 1);

  this.screen.splasher.addCopy(s);
};

AntSpirit.prototype.now = function() {
  return this.screen.now();
};

