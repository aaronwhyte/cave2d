/**
 * @constructor
 * @extends {BaseSpirit}
 */
function AntSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = BaseScreen.SpiritType.ANT;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;

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
AntSpirit.prototype = new BaseSpirit();
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
  return RigidModel.createCircle(8)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
      .setColorRGB(0.1, 1, 0.1);
};

AntSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new AntSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.8;
  b.hitGroup = BaseScreen.Group.ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 1.1;
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
  return this.screen.scan(
      BaseScreen.Group.ENEMY_SCAN,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad,
      this.scanResp);
};

AntSpirit.prototype.turnToPlayer = function() {
  var toPlayer = this.vecToPlayer.set(this.screen.playerAveragePos).subtract(this.getBodyPos());
  var right = this.vec2d2.setXY(1, 0).rot(this.dir);
  var dot = right.dot(toPlayer);
  this.angVel += 0.1 * dot / toPlayer.magnitude();
};

AntSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.stress = this.stress || 0;

  var friction = 0.05;
  var traction = 0.5;

  var now = this.now();
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
      var thrust = AntSpirit.THRUST * (this.health == AntSpirit.MAX_HEALTH ? 1 : 1.7);
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
  body.setVelAtTime(newVel, now);
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

AntSpirit.prototype.getScanHitSpirit = function() {
  var body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.dir));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

AntSpirit.prototype.onPlayerBulletHit = function() {
  this.health--;
  if (this.health <= 0) {
    this.explode();
  }
};

AntSpirit.prototype.explode = function() {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.explosionSplash(pos, body.rad * (2 + 0.5 * Math.random()));
  this.screen.soundKaboom(pos);
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

AntSpirit.prototype.explosionSplash = function(pos, rad) {
  var now = this.now();
  // cloud particles
  var s = this.screen.splash;
  var x = pos.x;
  var y = pos.y;
  var self = this;
  var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, sizeFactor) {
    s.reset(BaseScreen.SplashType.WALL_DAMAGE, self.screen.circleStamp);
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -Math.random());
    s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
    var startRad = sizeFactor * rad;
    s.startPose.scale.setXYZ(startRad, startRad, 1);
    s.endPose.scale.setXYZ(0, 0, 1);

    s.startColor.setXYZ(1, 1, 1);
    s.endColor.setXYZ(1, 1, 1);
    self.screen.splasher.addCopy(s);
  }

  // fast outer particles
  particles = Math.ceil(8 * (1 + 0.5 * Math.random()));
  explosionRad = 5;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 5 * (1 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random();
    dx = Math.sin(dir) * explosionRad / duration;
    dy = Math.cos(dir) * explosionRad / duration;
    addSplash(x, y, dx, dy, duration, 0.3);
  }

  // slow inner smoke ring
  particles = Math.ceil(4 * (1 + 0.5 * Math.random()));
  explosionRad = 2;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 12 * (0.5 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random()/4;
    dx = Math.sin(dir) * explosionRad / duration;
    dy = Math.cos(dir) * explosionRad / duration;
    addSplash(x, y, dx, dy, duration, 1);
  }
};
