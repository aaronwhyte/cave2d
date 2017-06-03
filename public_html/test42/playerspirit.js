/**
 * @constructor
 * @extends {BaseSpirit}
 */
function PlayerSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Test42BaseScreen.SpiritType.PLAYER;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.aim = new Vec2d();
  this.destAim = new Vec2d();
  this.slowKeyAimSpeed = 0;

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.lastFrictionTime = this.now();
  this.lastInputTime = this.now();

  this.accel = new Vec2d();
  this.slot = null;
}
PlayerSpirit.prototype = new BaseSpirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.SPEED = 2;
PlayerSpirit.TRACTION = 0.1;
PlayerSpirit.DISPLACEMENT_BOOST = 4;
PlayerSpirit.FRICTION = 0.01;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;
PlayerSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
PlayerSpirit.STOPPING_ANGVEL = 0.01;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "lastFrictionTime",
  5: "aim"
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
  return this;
};

/**
 * @param {ModelStamp} modelStamp
 * @returns {PlayerSpirit}
 */
PlayerSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
  return this;
};

/**
 * @param {PlayerSlot} slot
 * @returns {PlayerSpirit}
 */
PlayerSpirit.prototype.setSlot = function(slot) {
  this.slot = slot;
  return this;
};

PlayerSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
  return this;
};

PlayerSpirit.createModel = function() {
  return RigidModel.createCircle(24)
      .setColorRGB(1, 1, 1)
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
  b.hitGroup = this.screen.getHitGroups().PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

PlayerSpirit.prototype.handleInput = function() {
  var now = this.now();
  var duration = now - this.lastInputTime;
  this.lastInputTime = now;

  if (!this.slot) return;
  var state = this.slot.stateName;
  if (state == ControlState.PLAYING) {
    var body = this.getBody();
    if (!body) return;
    if (this.changeListener) {
      this.changeListener.onBeforeSpiritChange(this);
    }

    var controls = this.slot.getControlList();

    ////////////
    // MOVEMENT
    this.accel.reset();
    var stickScale = 1;
    var stick = controls.get(ControlName.STICK);
    var touchlike = stick.isTouchlike();
    var traction = PlayerSpirit.TRACTION * duration;
    var speed = PlayerSpirit.SPEED;

    // traction slowdown
    this.accel.set(body.vel).scale(-traction);

    stick.getVal(this.vec2d);
    var stickMag = this.vec2d.magnitude();
    if (touchlike) {
      // Allow the player to maintain top speed as long as they provide a teeny bit of input.
      stickScale = Math.min(1, (stickMag * 0.5 + 0.499999999));
      this.vec2d.scale(PlayerSpirit.DISPLACEMENT_BOOST);
    } else if (stick.isSpeedTriggerDown() && stickMag) {
      // When in keyboard precise-aiming mode, only accelerate
      // when the stick and the aim are close to the same direction.
      this.vec2d.scale(Math.max(0, this.vec2d.dot(this.aim)) / stickMag);
    }
    this.vec2d.scale(speed * traction).clipToMaxLength(speed * traction);
    this.accel.add(this.vec2d);
    body.addVelAtTime(this.accel, this.now());

    if (touchlike) {
      stick.scale(stickScale);
    }

    ////////////
    // BUTTONS
    var b1 = controls.get(ControlName.BUTTON_1);
    var b2 = controls.get(ControlName.BUTTON_2);
    if (b1.getVal()) {
      var r = 0;
      var g = 1 - 0.8 * Math.random();
      var b = 1 - 0.9 * Math.random();
      this.setColorRGB(r, g, b);
    }
    if (b2.getVal()) {
      var r = 1;
      var g = 1 - 0.8 * Math.random();
      var b = 1 - 0.9 * Math.random();
      this.setColorRGB(r, g, b);
    }

    ////////
    // AIM
    var dot, dist;
    if (touchlike) {
      // touch or pointer-lock
      if (stickMag) {
        dot = stick.getVal(this.vec2d).scaleToLength(1).dot(this.aim);
        // Any stick vector more than 90 degrees away from the aim vector is somewhat reverse:
        // 0 for 90 degreees, 1 for 180 degrees.
        // The more reverse the stick is, the less the old aim's contribution to the new aim.
        // That makes it easier to flip the aim nearly 180 degrees quickly.
        // Without that, the player ends up facing gliding backwards instead of aiming.
        var reverseness = Math.max(0, -dot);
        this.destAim.scale(0.5 * (1 - reverseness * 0.9)).add(stick.getVal(this.vec2d).scale(Math.min(3, 2 + 2 * stickMag)));
        this.destAim.scaleToLength(1);
        dist = stick.getVal(this.vec2d).distance(this.destAim);
        this.aim.slideByFraction(this.destAim, Math.min(1, dist * 2));
      }
      this.aim.slideByFraction(this.destAim, 0.5);

    } else {
      // up/down/left/right buttons
      var slowAimFriction = 0.05;
      if (stickMag) {
        if (stick.isSpeedTriggerDown()) {
          // precise keyboard aiming
          var correction = stick.getVal(this.vec2d).scaleToLength(1).subtract(this.destAim);
          dist = correction.magnitude();
          this.slowKeyAimSpeed += 0.004 * dist;
          slowAimFriction = 0.01;
          this.destAim.add(correction.scale(Math.min(1, this.slowKeyAimSpeed)));
        } else {
          // normal fast corrections
          stick.getVal(this.destAim);
          slowAimFriction = 1;
        }
      }
      this.slowKeyAimSpeed *= (1 - slowAimFriction);
      this.destAim.scaleToLength(1);
      dot = this.destAim.dot(this.aim);
      if (dot < -0.9) {
        // 180 degree flip, so set it instantly.
        this.aim.set(this.destAim);
      } else {
        dist = this.aim.distance(this.destAim);
        var distContrib = dist * 0.25;
        var smoothContrib = 0.1/(dist + 0.1);
        this.aim.slideByFraction(this.destAim, Math.min(1, smoothContrib + distContrib));
        this.aim.scaleToLength(1);
      }
    }
  }
};


PlayerSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var now = this.now();
  if (timeoutVal == PlayerSpirit.FRICTION_TIMEOUT_ID || timeoutVal == -1) {
    var duration = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.getBody();
    if (body) {
      body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.01;

      var friction = Math.pow(this.screen.isPlaying() ? PlayerSpirit.FRICTION : 0.3, duration);
      body.applyLinearFrictionAtTime(friction, now);
      body.applyAngularFrictionAtTime(friction, now);

      var newVel = this.vec2d.set(body.vel);

      if (!this.screen.isPlaying()) {
        var oldAngVelMag = Math.abs(this.getBodyAngVel());
        if (oldAngVelMag && oldAngVelMag < PlayerSpirit.STOPPING_ANGVEL) {
          this.setBodyAngVel(0);
        }
        var oldVelMagSq = newVel.magnitudeSquared();
        if (oldVelMagSq && oldVelMagSq < PlayerSpirit.STOPPING_SPEED_SQUARED) {
          newVel.reset();
        }
      }

      body.setVelAtTime(newVel, now);
      body.invalidatePath();
    }
    world.addTimeout(now + PlayerSpirit.FRICTION_TIMEOUT, this.id, PlayerSpirit.FRICTION_TIMEOUT_ID);
  }
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  if (!body) return;
  var bodyPos = this.getBodyPos();
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toShearZOpXY(-this.aim.x, -this.aim.y))
      .multiply(this.mat44.toRotateZOp(-body.vel.x * 0.2));
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color)
      .setModelMatrix(this.modelMatrix)
      .drawStamp();

  // draw aim guide
  renderer.setStamp(this.stamps.cylinderStamp);
  // renderer.setColorVector(this.color);
  var p1 = this.vec2d;
  var p2 = this.vec2d2;
  var aimLen = 1.5;
  var rad = body.rad * 0.2;
  p1.set(this.aim).scaleToLength(body.rad * 2).add(bodyPos);
  p2.set(this.aim).scaleToLength(body.rad * 2 + aimLen).add(bodyPos);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(p1.x, p1.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
  renderer.setModelMatrix(this.modelMatrix);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(p2.x, p2.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(rad, rad, 1));
  renderer.setModelMatrix2(this.modelMatrix);
  renderer.drawStamp();
  // p1.free();
  // p2.free();

};

PlayerSpirit.prototype.explode = function() {
  var body = this.getBody();
  if (body) {
    var now = this.now();
    var pos = this.getBodyPos();
    var x = pos.x;
    var y = pos.y;

    // giant tube explosion
    var s = this.screen.splash;
    s.reset(1, this.stamps.tubeStamp);

    s.startTime = now;
    s.duration = 10;
    var rad = 10;
    var endRad = 0;

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
    s.startColor.set(this.color);
    s.endColor.setXYZ(0, 0, 0);

    this.screen.splasher.addCopy(s);

    // cloud particles

    var self = this;
    var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

    function addSplash(x, y, dx, dy, duration, sizeFactor) {
      s.reset(1, self.stamps.circleStamp);
      s.startTime = now;
      s.duration = duration;

      s.startPose.pos.setXYZ(x, y, -Math.random());
      s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
      var startRad = sizeFactor * body.rad;
      s.startPose.scale.setXYZ(startRad, startRad, 1);
      s.endPose.scale.setXYZ(0, 0, 1);

      s.startColor.set(self.color);
      s.endColor.set(self.color).scale1(0.5);
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

    // inner smoke ring
    particles = Math.ceil(20 * (1 + 0.5 * Math.random()));
    explosionRad = 4;
    dirOffset = 2 * Math.PI * Math.random();
    for (i = 0; i < particles; i++) {
      duration = 20 * (0.5 + Math.random());
      dir = dirOffset + 2 * Math.PI * (i / particles) + Math.random() / 4;
      var thisRad = explosionRad + (0.5 + Math.random());
      dx = Math.sin(dir) * explosionRad / duration;
      dy = Math.cos(dir) * explosionRad / duration;
      addSplash(x, y, dx, dy, duration, 2);
    }
  }
};
