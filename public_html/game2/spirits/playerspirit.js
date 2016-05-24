/**
 * @constructor
 * @extends {Spirit}
 */
function PlayerSpirit(screen) {
  Spirit.call(this);
  this.screen = screen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;

  this.fireReady = true;
  this.currAimVec = new Vec2d(0, 1);
  this.destAimVec = new Vec2d(0, 1);

  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.accel = new Vec2d();
  this.newVel = new Vec2d();
  this.scanVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.screen.now();
  this.lastInputTime = this.screen.now();
  this.bang = new BangVal(PlayerSpirit.BANG_DECAY, PlayerSpirit.MAX_BANG);
  this.shots = PlayerSpirit.MAX_SHOTS;

  this.maxHealth = PlayerSpirit.STARTING_HEALTH;
  this.health = this.maxHealth;
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.STARTING_HEALTH = 1;

PlayerSpirit.BANG_DECAY = 0.2;
PlayerSpirit.MAX_BANG = 1.5;

PlayerSpirit.TRACKBALL_ACCEL = 1;
PlayerSpirit.TRACKBALL_TRACTION = 0.6;
PlayerSpirit.TRACKBALL_MAX_ACCEL = 5;
PlayerSpirit.AIM_HYSTERESIS = 0.6;

PlayerSpirit.FRICTION = 0.1;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.FIRE_TIMEOUT = 3.01;
PlayerSpirit.FIRE_TIMEOUT_ID = 20;
PlayerSpirit.FIRE_BURST_DURATION = PlayerSpirit.FIRE_TIMEOUT / 2;

PlayerSpirit.MAX_SHOTS = 5;

PlayerSpirit.RESPAWN_TIMEOUT = 50;
PlayerSpirit.RESPAWN_TIMEOUT_ID = 30;

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
  return RigidModel.createCircleMesh(4)
      .setColorRGB(1, 0.3, 0.6);
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
  b.setPosAtTime(pos, this.screen.now());
  b.rad = 0.9;
  b.hitGroup = BaseScreen.Group.ROCK;
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

PlayerSpirit.prototype.scan = function(pos, rot, dist, rad) {
  return this.screen.scan(
      BaseScreen.Group.ROCK,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad);
};

PlayerSpirit.prototype.handleInput = function(tx, ty, tt, tContrib, b1, b2) {
  var now = this.screen.now();
  var time = now - this.lastInputTime;
  this.lastInputTime = now;

  // If stun is one or higher, ignore input!
  var stun = this.bang.getValAtTime(now);
  var stunned = stun >= 1;
  if (tt && !stunned) {
    var body = this.screen.getBodyById(this.bodyId);
    if (body) {
      this.newVel.set(body.vel);
      this.accel.set(this.newVel).scale(-PlayerSpirit.TRACKBALL_TRACTION);
      this.newVel.add(this.accel.scale(time));

      this.accel.setXY(tx, -ty).scale(PlayerSpirit.TRACKBALL_ACCEL * PlayerSpirit.TRACKBALL_TRACTION)
          .clipToMaxLength(PlayerSpirit.TRACKBALL_MAX_ACCEL);
      // stun decreases control responsiveness
      this.accel.scale(1 - stun);

      this.newVel.add(this.accel.scale(time));
      body.setVelAtTime(this.newVel, now);
    }
  }

  // firing logic
  if (!b2 && !this.firing()) {
    this.shots = PlayerSpirit.MAX_SHOTS;
  }
  if (!stunned && b2) {
    // not stunned and the button is down
    // extend burst time
    this.fireBurstEndTime = now + PlayerSpirit.FIRE_BURST_DURATION;
    // either start firing or wait for existing timeout
    if (this.fireReady) {
      this.fire();
    }
  }
  if (!b2) {
    if (tx || ty) {
      this.vec2d.setXY(tx, -ty);
      if (tContrib & (Trackball.CONTRIB_TOUCH | Trackball.CONTRIB_MOUSE)) {
        // It's touch or mouse, which get very quantized at low speed. Square contribution and smooth it.
        this.vec2d.scale(this.vec2d.magnitude());
        this.destAimVec.add(this.vec2d).scaleToLength(PlayerSpirit.AIM_HYSTERESIS);
      } else if (tContrib & Trackball.CONTRIB_KEY) {
        // It's keyboard.
        this.destAimVec.setXY(tx, -ty).scaleToLength(PlayerSpirit.AIM_HYSTERESIS);
        // did the player reverse the direction of aim?
        if (this.vec2d.set(this.currAimVec).add(this.destAimVec).magnitudeSquared() < 0.1) {
          // reverse aim direction with zero delay.
          this.currAimVec.set(this.destAimVec);
        }
      } else if (tContrib) {
        console.log("unexpected trackball contribution: " + tContrib);
      }
    }
  }
  // move currAimVec towards destAimVec
  var aimChange = this.vec2d.set(this.destAimVec).subtract(this.currAimVec)
      .clipToMaxLength(PlayerSpirit.AIM_HYSTERESIS / 6);
  this.currAimVec.add(aimChange);

};

PlayerSpirit.prototype.fire = function() {
  var body = this.screen.getBodyById(this.bodyId);
  if (body) {
    body.getPosAtTime(this.screen.now(), this.tempBodyPos);
    for (var i = 0; i < this.shots; i++) {
      var angle = 0.33 * Math.PI * (i - (this.shots - 1) / 2) / PlayerSpirit.MAX_SHOTS;
      this.addBullet(
          this.tempBodyPos,
          this.vec2d
              .set(this.currAimVec)
              .scaleToLength(5 - 2.5 * (this.shots-1) / PlayerSpirit.MAX_SHOTS)
              .rot(angle + 0.05 * (Math.random()-0.5)),
          0.3,
          7);
    }
    this.fireReady = false;
    this.screen.world.addTimeout(this.screen.now() + PlayerSpirit.FIRE_TIMEOUT * (1 + (this.shots-1)*0.7),
        this.id, PlayerSpirit.FIRE_TIMEOUT_ID);
    this.shots = Math.max(1, this.shots - 1);
  }
};

PlayerSpirit.prototype.onTimeout = function(world, timeoutVal) {
  var now = this.screen.now();
  if (timeoutVal == PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal == -1) {
    var time = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.screen.getBodyById(this.bodyId);
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
  } else if (timeoutVal == PlayerSpirit.FIRE_TIMEOUT_ID) {
    this.fireReady = true;
    if (this.firing()) {
      this.fire();
    }
  } else if (timeoutVal == PlayerSpirit.RESPAWN_TIMEOUT_ID) {
    this.respawn();
  }
};

PlayerSpirit.prototype.firing = function() {
  return this.screen.now() <= this.fireBurstEndTime;
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  // TODO: replace world access with screen API?
  var body = this.getBody(world);
  if (body) {
    var bodyPos = body.getPosAtTime(world.now, this.tempBodyPos);
    var alertness = 1 - 0.7 * (this.bang.getValAtTime(this.screen.now()) / PlayerSpirit.MAX_BANG);
    renderer
        .setStamp(this.modelStamp)
        .setColorVector(this.vec4.set(this.color).scale1(alertness));
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
        .multiply(this.mat44.toRotateZOp(-this.dir));
    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();

    // draw aim guide
    // TODO: Don't use a splash for this, just draw it.
    var s = this.screen.splash;
    // TODO rename soundStamp to tubeStamp
    s.reset(BaseScreen.SplashType.MUZZLE_FLASH, this.screen.soundStamp);

    s.startTime = this.screen.now();
    s.duration = 0.2;

    var p1 = Vec2d.alloc();
    var p2 = Vec2d.alloc();

    p1.set(this.currAimVec).scaleToLength(body.rad * 2).add(bodyPos);
    p2.set(this.currAimVec).scaleToLength(body.rad * 4).add(bodyPos);

    var thickness = this.firing() ? 0.2 : 0.2;

    s.startPose.pos.setXYZ(p1.x, p1.y, Math.random() - 0.3);
    s.endPose.pos.setXYZ(p1.x, p1.y, 0);
    s.startPose.scale.setXYZ(thickness, thickness, 1);
    s.endPose.scale.setXYZ(0, 0, 1);

    s.startPose2.pos.setXYZ(p2.x, p2.y, Math.random() - 0.1);
    s.endPose2.pos.setXYZ(p2.x, p2.y, 0);
    s.startPose2.scale.setXYZ(thickness, thickness, 1);
    s.endPose2.scale.setXYZ(0, 0, 1);

    s.startPose.rotZ = 0;
    s.endPose.rotZ = 0;

    s.startColor.setXYZ(1, 0.3, 0.6).scale1(0.5);
    s.endColor.setXYZ(1, 0.3, 0.6).scale1(0.5);

    this.screen.splasher.addCopy(s);

    p1.free();
    p2.free();
  }
};

PlayerSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};

PlayerSpirit.prototype.addBullet = function(pos, vel, rad, duration) {
  var now = this.screen.now();
  var spirit = new BulletSpirit(this.screen);
  spirit.setModelStamp(this.screen.circleStamp); // TODO
  spirit.setColorRGB(1, 0.3, 0.6);
  var density = 20;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = BaseScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  var spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.screen.world.addTimeout(now + duration, spiritId, 0);
  spirit.addTrailSegment();

  this.screen.soundPew(pos);

  return spiritId;
};

PlayerSpirit.prototype.addHealth = function(h) {
  this.health += h;
  if (this.health <= 0) {
    this.die();
  }
};

PlayerSpirit.prototype.die = function() {
  var body = this.getBody(this.screen.world);
  if (body) {
    var now = this.screen.now();
    var pos = body.getPosAtTime(now, this.tempBodyPos);
    var x = pos.x;
    var y = pos.y;

    // giant tube explosion

    var s = this.screen.splash;
    s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.soundStamp);

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

      s.startColor.setXYZ(1, 1, 1);
      s.endColor.setXYZ(1, 1, 1);
      self.screen.splasher.addCopy(s);
    }

    // fast outer particles
    particles = Math.ceil(15 * (1 + 0.5 * Math.random()));
    explosionRad = 20;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 15 * (1 + Math.random());
      dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random();
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 1);
    }

    // slow inner smoke ring
    particles = Math.ceil(20 * (1 + 0.5 * Math.random()));
    explosionRad = 8;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 40 * (1 + Math.random()*0.2);
      dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random()/4;
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 2);
    }

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

PlayerSpirit.prototype.respawn = function() {
  var body = this.createBody(this.tempBodyPos, this.dir);
  var now = this.screen.now();
  this.health = this.maxHealth;
  this.bodyId = this.screen.world.addBody(body);
  var pos = this.tempBodyPos;

  this.screen.soundPlayerSpawn(pos);

  // splash
  var x = pos.x;
  var y = pos.y;

  var s = this.screen.splash;
  s.reset(BaseScreen.SplashType.WALL_DAMAGE, this.screen.soundStamp);

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
  s.startColor.setXYZ(1, 1, 0);
  s.endColor.setXYZ(0, 0, 0);

  this.screen.splasher.addCopy(s);

};