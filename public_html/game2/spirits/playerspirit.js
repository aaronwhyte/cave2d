/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;

  this.isFireReady = true;
  this.currAimVec = new Vec2d(0, 1);
  this.destAimVec = new Vec2d(0, 1);

  this.vec2d = new Vec2d();
  this.accel = new Vec2d();
  this.newVel = new Vec2d();
  this.scanVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();
  this.bang = new BangVal(PlayerSpirit.BANG_DECAY, PlayerSpirit.MAX_BANG);

  this.maxHealth = PlayerSpirit.STARTING_HEALTH;
  this.health = this.maxHealth;

  this.lastWarp = -Infinity;
  this.lastFireTime =-Infinity;

  this.shotgun = new ShotgunWeapon(screen, this, BaseScreen.Group.PLAYER_FIRE, PlayerSpirit.SHOTGUN_TIMEOUT_ID);
  this.laser = new LaserWeapon(screen, this, BaseScreen.Group.PLAYER_FIRE, PlayerSpirit.LASER_TIMEOUT_ID);
  this.weapon = this.shotgun;
  this.oldb1 = false;

  this.shieldEndTime = 0;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.STARTING_HEALTH = 1;

PlayerSpirit.BANG_DECAY = 0.2;
PlayerSpirit.MAX_BANG = 1.5;

PlayerSpirit.TRACKBALL_ACCEL = 1;
PlayerSpirit.TRACKBALL_TRACTION = 0.3;
PlayerSpirit.TRACKBALL_MAX_ACCEL = 5;
PlayerSpirit.AIM_SENSITIVITY = 2;

PlayerSpirit.FRICTION = 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.SHOTGUN_TIMEOUT_ID = 20;
PlayerSpirit.LASER_TIMEOUT_ID = 21;

PlayerSpirit.RESPAWN_TIMEOUT = 70;
PlayerSpirit.RESPAWN_TIMEOUT_ID = 30;

PlayerSpirit.SHIELD_TIMEOUT = 50;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel",
  6: "maxHealth",
  7: "health"
};

PlayerSpirit.getJsoner = function() {
  if (!PlayerSpirit.jsoner) {
    PlayerSpirit.jsoner = new Jsoner(PlayerSpirit.SCHEMA);
  }
  return PlayerSpirit.jsoner;
};

PlayerSpirit.prototype.toJSON = function() {
  return PlayerSpirit.getJsoner().toJSON(this);
};

PlayerSpirit.prototype.setFromJSON = function(json) {
  PlayerSpirit.getJsoner().setFromJSON(json, this);
};

PlayerSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

PlayerSpirit.prototype.setTrackball = function(trackball) {
  this.trackball = trackball;
};

PlayerSpirit.createModel = function() {
  return RigidModel.createCircle(24)
      .setColorRGB(1, 0.3, 0.6)
      .addRigidModel(RigidModel.createCircle(12)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(-0.32, 0.23, -0.25))
          .setColorRGB(0, 0, 0))
      .addRigidModel(RigidModel.createCircle(12)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0.32, 0.23, -0.25))
          .setColorRGB(0, 0, 0))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.07, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.37, -0.25))
          .setColorRGB(0, 0, 0));
};

PlayerSpirit.factory = function(playScreen, stamp, pos, dir) {
  var world = playScreen.world;

  var spirit = new PlayerSpirit(playScreen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);

  var spiritId = world.addSpirit(spirit);
  var b = spirit.createBody(pos, dir);
  spirit.bodyId = world.addBody(b);

  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
};

PlayerSpirit.prototype.createBody = function(pos, dir) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.now());
  b.rad = 0.9;
  b.hitGroup = BaseScreen.Group.PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.onBang = function(accel, now) {
  this.bang.addValAtTime(accel, now);
};

PlayerSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

/**
 *
 * @param {number} tx trackball x movement since last time
 * @param {number} ty trackball y movement since last time
 * @param {boolean} tt whether the trackball is touched (works good for touchscreens, otherwise meh
 * @param {number} tContrib bitflags indicating whether key, touch, or mouse were contributors to the trackball
 * @param {boolean} b1 button one down?
 * @param {boolean} b2 button two down?
 */
PlayerSpirit.prototype.handleInput = function(tx, ty, tt, tContrib, b1, b2) {
  var now = this.now();
  var time = now - this.lastInputTime;
  this.lastInputTime = now;

  // If stun is one or higher, ignore input!
  var stun = this.bang.getValAtTime(now);
  var stunned = stun >= 1;
  if (tt && !stunned) {
    var body = this.getBody();
    if (body) {
      this.newVel.set(body.vel);
      this.accel.set(this.newVel).scale(-PlayerSpirit.TRACKBALL_TRACTION);
      this.newVel.add(this.accel.scale(time / this.screen.timeMultiplier));

      this.accel.setXY(tx, -ty).scale(PlayerSpirit.TRACKBALL_ACCEL * PlayerSpirit.TRACKBALL_TRACTION)
          .clipToMaxLength(PlayerSpirit.TRACKBALL_MAX_ACCEL);
      // stun decreases control responsiveness
      this.accel.scale(1 - stun);
      this.newVel.add(this.accel.scale(time / this.screen.timeMultiplier));
      body.setVelAtTime(this.newVel, now);
    }
  }

  // Weapon stuff
  if (b1 && !this.oldb1) {
    // switch weapons
    this.weapon.buttonDown = false;
    if (this.weapon == this.shotgun) {
      this.weapon = this.laser;
    } else {
      this.weapon = this.shotgun;
    }
  }
  this.oldb1 = b1;
  var aimLock = b2;
  if ((tx || ty) && !aimLock) {
    this.vec2d.setXY(tx, -ty);
    if (tContrib & (Trackball.CONTRIB_TOUCH | Trackball.CONTRIB_MOUSE)) {
      // It's touch or mouse, which get very quantized at low speed. Square contribution and smooth it.
      this.vec2d.scale(this.vec2d.magnitude() * PlayerSpirit.AIM_SENSITIVITY);
      this.destAimVec.add(this.vec2d);
    } else if (tContrib & Trackball.CONTRIB_KEY) {
      // It's keyboard.
      this.destAimVec.setXY(tx, -ty);
    } else if (tContrib) {
      console.warn("unexpected trackball contribution: " + tContrib);
    }
    // Player aim is always a unit vector.
    this.destAimVec.scaleToLength(1);
  }
  this.weapon.handleInput(this.destAimVec.x, this.destAimVec.y, b2);
};

PlayerSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var now = this.now();
  if (timeoutVal == PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal == -1) {
    var time = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.getBody();
    if (body) {
      this.newVel.set(body.vel);
      this.accel.set(this.newVel).scale(-PlayerSpirit.FRICTION);
      this.newVel.add(this.accel.scale(time));

      // Reset the body's pathDurationMax because it gets changed at compile-time,
      // but it is serialized at level-save-time, so old saved values might not
      // match the new compiled-in values. Hm.
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
      body.setVelAtTime(this.newVel, now);
    }
    // TODO: put addTimeout in screen, remove world access
    world.addTimeout(now + PlayerSpirit.FRICTION_TIMEOUT, this.id, PlayerSpirit.FRICTION_TIMEOUT_ID);
  } else if (timeoutVal == PlayerSpirit.SHOTGUN_TIMEOUT_ID) {
    this.shotgun.onTimeout();
    if (this.shotgun == this.weapon) {
      this.shotgun.fire();
    }
  } else if (timeoutVal == PlayerSpirit.LASER_TIMEOUT_ID) {
    this.laser.onTimeout();
    if (this.laser == this.weapon) {
      this.laser.fire();
    }
  } else if (timeoutVal == PlayerSpirit.RESPAWN_TIMEOUT_ID) {
    this.respawn();
  }
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  // TODO: replace world access with screen API?
  var body = this.getBody();
  if (body) {
    var bodyPos = this.getBodyPos();
    var alertness = 1 - 0.7 * (this.bang.getValAtTime(this.now()) / PlayerSpirit.MAX_BANG);
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color).scale1(alertness));
    this.vec2d.set(this.weapon.currAimVec).scaleToLength(-1.2 * Math.max(0.5, Math.min(1, body.vel.magnitude())));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toSheerZOpXY(this.vec2d.x, this.vec2d.y))
        .multiply(this.mat44.toRotateZOp(-body.vel.x * 0.2));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();

    // draw aim guide
    this.screen.renderer.setStamp(this.screen.cylinderStamp);
    var shotgun = this.weapon == this.shotgun;
    if (shotgun) {
      this.screen.renderer.setColorVector(this.vec4.setXYZ(1, 1, 0.5).scale1(Math.random() * 0.2 + 0.5));
    } else {
      this.screen.renderer.setColorVector(this.vec4.setXYZ(0.5, 1, 1).scale1(Math.random() * 0.2 + 0.5));
    }
    var p1 = Vec2d.alloc();
    var p2 = Vec2d.alloc();
    var aimLen = body.rad * (shotgun ? 1.5 : 2.5);
    var rad = shotgun ? 0.32 : 0.18;
    p1.set(this.weapon.currAimVec).scaleToLength(body.rad * 2).add(bodyPos);
    p2.set(this.weapon.currAimVec).scaleToLength(body.rad * (2 + aimLen)).add(bodyPos);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.screen.renderer.setModelMatrix(this.modelMatrix);
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
    this.screen.renderer.setModelMatrix2(this.modelMatrix);
    this.screen.renderer.drawStamp();
    p1.free();
    p2.free();

    if (this.isShielded()) {
      var howShielded = (this.shieldEndTime - this.now()) / PlayerSpirit.SHIELD_TIMEOUT;
      renderer
          .setStamp(this.screen.circleStamp)
          .setColorVector(this.vec4.setXYZ(0, 1, 1));
      this.modelMatrix.toIdentity()
          .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0.01))
          .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
          .multiply(this.mat44.toScaleOpXYZ(1.05 + 0.1 * howShielded, 1.05 + 0.1 * howShielded, 1));
      renderer.setModelMatrix(this.modelMatrix);
      renderer.drawStamp();
    }
  }
};

PlayerSpirit.prototype.hitAnt = function(mag) {
  if (this.isShielded()) {
    this.screen.soundShieldThump(this.getBodyPos(), mag);
  } else {
    this.addHealth(-1);
  }
};

PlayerSpirit.prototype.addHealth = function(h) {
  this.health += h;
  if (this.health <= 0) {
    this.die();
  }
};

PlayerSpirit.prototype.die = function() {
  this.screen.playerChasePolarity = -0.03;
  var body = this.getBody();
  if (body) {
    var now = this.now();
    var pos = this.getBodyPos();
    var x = pos.x;
    var y = pos.y;

    this.screen.drawTerrainPill(pos, pos, body.rad * 4, 1);

    // giant tube explosion
    var s = this.screen.splash;
    s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.tubeStamp);

    s.startTime = now;
    s.duration = 20;
    var rad = 30;

    var endRad = rad * 2;

    s.startPose.pos.setXYZ(x, y, -0.5);
    s.endPose.pos.setXYZ(x, y, 0);
    s.startPose.scale.setXYZ(rad, rad, 1);
    s.endPose.scale.setXYZ(endRad, endRad, 1);

    s.startPose2.pos.setXYZ(x, y, 1);
    s.endPose2.pos.setXYZ(x, y, 1);
    s.startPose2.scale.setXYZ(-rad, -rad, 1);
    s.endPose2.scale.setXYZ(endRad, endRad, 1);

    s.startPose.rotZ = 0;
    s.endPose.rotZ = 0;
    s.startColor.setXYZ(1, 0.3, 0.6);
    s.endColor.setXYZ(0, 0, 0);

    this.screen.splasher.addCopy(s);

    // cloud particles

    var self = this;
    var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

    function addSplash(x, y, dx, dy, duration, sizeFactor) {
      s.reset(BaseScreen.SplashType.WALL_DAMAGE, self.screen.circleStamp);
      s.startTime = now;
      s.duration = duration;

      s.startPose.pos.setXYZ(x, y, -Math.random());
      s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
      var startRad = sizeFactor * body.rad;
      s.startPose.scale.setXYZ(startRad, startRad, 1);
      s.endPose.scale.setXYZ(0, 0, 1);

      s.startColor.setXYZ(1, 0.3, 0.6);
      s.endColor.setXYZ(1/2, 0.3/2, 0.6/2);
      self.screen.splasher.addCopy(s);
    }

//    // fast outer particles
//    particles = Math.ceil(15 * (1 + 0.5 * Math.random()));
//    explosionRad = 20;
//    dirOffset = 2 * Math.PI * Math.random();
//    for (i = 0; i < particles; i++) {
//      duration = 15 * (1 + Math.random());
//      dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random();
//      dx = Math.sin(dir) * explosionRad / duration;
//      dy = Math.cos(dir) * explosionRad / duration;
//      addSplash(x, y, dx, dy, duration, 1);
//    }

    // inner smoke ring
    particles = Math.ceil(20 * (1 + 0.5 * Math.random()));
    explosionRad = 4;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 20 * (0.5 + Math.random());
      dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random()/4;
      var thisRad = explosionRad + (0.5 + Math.random());
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 2);
    }

    var craterRad = body.rad * 10;
    this.bulletBurst(pos, body.rad * 0.5, 0, craterRad);

    // delete body
    this.screen.world.removeBodyId(this.bodyId);
    this.bodyId = null;

    // sound
    this.screen.soundPlayerExplode(pos);

    // prep to respawn
    this.screen.world.addTimeout(now + PlayerSpirit.RESPAWN_TIMEOUT,
        this.id, PlayerSpirit.RESPAWN_TIMEOUT_ID);
  }
};

PlayerSpirit.prototype.bulletBurst = function(pos, bulletRad, startRad, endRad) {
  var p = Vec2d.alloc();
  var v = Vec2d.alloc();
  var bulletCount = Math.floor(16 + 4 * Math.random());
  var a = Math.random() * Math.PI;
  for (var i = 0; i < bulletCount; i++) {
    var duration = 10 + 5 * Math.random();
    var speed = (endRad - startRad) / duration;
    a += 2 * Math.PI / bulletCount;
    v.setXY(0, 1).rot(a + Math.random() * 0.1);
    p.set(v).scale(startRad).add(pos);
    v.scale(speed);
    this.addExplosionBullet(p, v, bulletRad, duration);
  }
  v.free();
  p.free();
};

PlayerSpirit.prototype.addExplosionBullet = function(pos, vel, rad, duration) {
  var now = this.now();
  var spirit = BulletSpirit.alloc(this.screen);
  spirit.setModelStamp(this.screen.circleStamp);
  spirit.setColorRGB(1, 0.3, 0.6);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = BaseScreen.Group.PLAYER_FIRE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  var spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.digChance = 999;
  spirit.bounceChance = 0;
  spirit.damage = 0;
  spirit.wallDamageMultiplier = 1.6;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

PlayerSpirit.prototype.respawn = function() {
  this.screen.playerChasePolarity = 1;
  var body = this.createBody(this.tempBodyPos, this.dir);
  var now = this.now();
  this.health = this.maxHealth;
  this.bodyId = this.screen.world.addBody(body);
  var pos = this.tempBodyPos;

  this.screen.soundPlayerSpawn(pos);

  // splash
  var x = pos.x;
  var y = pos.y;

  var s = this.screen.splash;
  s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.tubeStamp);

  s.startTime = now;
  s.duration = 10;
  var startRad = body.rad * 2;
  var endRad = body.rad * 8;

  s.startPose.pos.setXYZ(x, y, 1);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(0, 0, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, 1);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(startRad, startRad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(0, 1, 1);
  s.endColor.setXYZ(0, 0, 0);

  this.screen.splasher.addCopy(s);

  this.shieldsUp();
};

PlayerSpirit.prototype.shieldsUp = function() {
  this.shieldEndTime = this.now() + PlayerSpirit.SHIELD_TIMEOUT;
};

PlayerSpirit.prototype.isShielded = function() {
  return this.now() < this.shieldEndTime;
};
