/**
 * @constructor
 * @extends {BaseSpirit}
 */
function AntSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.ANT;
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
  this.stress = 0;

  this.lastControlTime = this.now();
  this.viewportsFromCamera = 0;

  // So I don't need to delete and re-add ants whenever I change their max health,
  // normalize health to be a fraction, between 0 and 1.
  this.health = 1;
}
AntSpirit.prototype = new BaseSpirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 1.2;
AntSpirit.THRUST = 0.3;
AntSpirit.MAX_TIMEOUT = 10;
AntSpirit.LOW_POWER_VIEWPORTS_AWAY = 2;
AntSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
AntSpirit.MAX_HEALTH = 3;
AntSpirit.OPTIMIZE = true;

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
  b.turnable = true;
  b.grip = 0.9;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.5 + Math.random();
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

AntSpirit.prototype.turnToPlayer = function() {
  var toPlayer = this.vecToPlayer.set(this.screen.playerAveragePos).subtract(this.getBodyPos());
  var playerDist = toPlayer.magnitude();
  var right = this.vec2d2.setXY(1, 0).rot(this.getBodyAngPos());
  var dot = right.dot(toPlayer);
  var dotUnit = dot / playerDist;

  this.addBodyAngVel(0.9 * this.screen.playerChasePolarity * dotUnit / (0.5 * playerDist + 2));
};

AntSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.stress = this.stress || 0;

  var friction = this.screen.isPlaying() ? 0.05 : 0.3;
  var traction = 0.4;

  var now = this.now();
  var time = Math.max(0, Math.min(AntSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);

  var newVel = this.vec2d.set(body.vel);
  if (AntSpirit.OPTIMIZE && newVel.magnitudeSquared() < AntSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  if (this.screen.isPlaying()) {
    if (!AntSpirit.OPTIMIZE || this.viewportsFromCamera < AntSpirit.LOW_POWER_VIEWPORTS_AWAY) {
      var antennaRotMag = Math.max(Math.PI * 0.15, Math.PI * this.stress);
      // they get faster as they get hurt
      var thrust = AntSpirit.THRUST * (2 - this.health) +
          (body.rad < 1 ? 0.5 * (1 - body.rad) : 0);
      var scanDist = 0.6 * (3 + (1 - this.stress)) * thrust / AntSpirit.THRUST;
      var scanRot = 2 * antennaRotMag * (Math.random() - 0.5) + this.getBodyAngVel();
      var distFrac = this.scan(pos, scanRot, scanDist, body.rad);
      var closeness = 1 - distFrac;
      var angAccel = 0;
      if (distFrac >= 0) {
        // rayscan hit
        var otherSpirit = this.getScanHitSpirit();
        if (otherSpirit && otherSpirit.type == Game4BaseScreen.SpiritType.PLAYER) {
          // attack player!
          this.stress = 0;
          angAccel = 0.4 * scanRot;
          thrust *= 1.2;
        } else {
          // avoid obstruction
          angAccel = -scanRot * (0.2 * this.stress + 1) * closeness;
          this.stress += 0.06 * closeness;
          thrust *= distFrac;
        }
      } else {
        // clear path
        // turn towards the scan
        angAccel = 0.2 * scanRot;
        this.stress = 0;
        // and turn towards the player
        this.turnToPlayer();
      }
      this.stress = Math.min(1, Math.max(0, this.stress));

      body.addAngVelAtTime(angAccel, now);
      body.applyAngularFrictionAtTime(0.4, now);

      var dir = this.getBodyAngPos();

      this.accel
          .set(body.vel).scale(-traction * time)
          .addXY(
              Math.sin(dir) * thrust * traction * time,
              Math.cos(dir) * thrust * traction * time);
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
        0.3 * //Math.max(this.health, 0.3) *
            AntSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera));
  } else {
    timeoutDuration = AntSpirit.MEASURE_TIMEOUT * (1 - Math.random() * 0.05);
  }
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
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
        .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }
};

AntSpirit.prototype.onPlayerBulletHit = function(damage) {
  var rad = this.getBody().rad;
  this.health -= damage / (AntSpirit.MAX_HEALTH * rad * rad * rad);
  if (this.health <= 0) {
    this.explode();
  }
};

AntSpirit.prototype.explode = function() {
  var body = this.getBody();
  var pos = this.getBodyPos();
  var craterRad = body.rad * (7 + 2 * Math.random());
  this.explosionSplash(pos, craterRad * 0.6);
  var bulletRad = body.rad * 0.75;
  this.bulletBurst(pos, bulletRad, body.rad - bulletRad, craterRad);
  this.screen.sounds.antExplode(pos);
  this.screen.drawTerrainPill(pos, pos, body.rad, 0);

  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};

AntSpirit.prototype.bulletBurst = function(pos, bulletRad, startRad, endRad) {
  var p = Vec2d.alloc();
  var v = Vec2d.alloc();
  var bulletCount = Math.floor(8 + 2 * Math.random());
  var a = Math.random() * Math.PI;
  for (var i = 0; i < bulletCount; i++) {
    var duration = 7 + 2 * Math.random();
    var speed = (endRad - startRad) / duration;
    a += 2 * Math.PI / bulletCount;
    v.setXY(0, 1).rot(a + Math.random() * Math.PI * 0.15);
    p.set(v).scale(startRad).add(pos);
    v.scale(speed);
    this.addBullet(p, v, bulletRad, duration);
  }
  v.free();
  p.free();
};

AntSpirit.prototype.addBullet = function(pos, vel, rad, duration) {
  var now = this.now();
  var spirit = BulletSpirit.alloc(this.screen);
  spirit.setModelStamp(this.stamps.circleStamp);
  spirit.setColorRGB(0, 0.5, 0);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.screen.getHitGroups().ENEMY_FIRE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  var spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.digChance = 9;
  spirit.bounceChance = 9;
  spirit.damage = 0;
  spirit.wallDamageMultiplier = 1.7;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
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
    s.reset(Game4BaseScreen.SplashType.WALL_DAMAGE, self.stamps.circleStamp);
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -0.9);
    s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 0);
    var startRad = sizeFactor * rad;
    s.startPose.scale.setXYZ(startRad, startRad, 1);
    s.endPose.scale.setXYZ(0, 0, 1);
    s.startColor.setXYZ(0, 1, 0); // ant color
    s.endColor.setXYZ(0.2, 0.3, 0.6); // wall color
    self.screen.splasher.addCopy(s);
  }

  particles = Math.ceil(5 * (1 + 0.5 * Math.random()));
  explosionRad = rad/2;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 10 * (0.5 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random()/4;
    dx = 0.5 * Math.sin(dir) * explosionRad / duration;
    dy = 0.5 * Math.cos(dir) * explosionRad / duration;
    addSplash(x + dx, y + dy, dx, dy, duration, explosionRad/2);
  }
};
