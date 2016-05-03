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
  this.firing = false;
  this.fireVec = new Vec2d();

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
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.BANG_DECAY = 0.2;
PlayerSpirit.MAX_BANG = 1.2;

PlayerSpirit.TRACKBALL_ACCEL = 1;
PlayerSpirit.TRACKBALL_TRACTION = 0.6;
PlayerSpirit.TRACKBALL_MAX_ACCEL = 5;

PlayerSpirit.FRICTION = 0.05;
PlayerSpirit.FRICTION_TIMEOUT = 1;
PlayerSpirit.FRICTION_TIMEOUT_ID = 10;

PlayerSpirit.FIRE_TIMEOUT = 7;
PlayerSpirit.FIRE_TIMEOUT_ID = 20;

PlayerSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel"
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
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, world.now);
  b.rad = 0.9;
  b.hitGroup = BaseScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, PlayerSpirit.FRICTION_TIMEOUT_ID);
  return spiritId;
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

PlayerSpirit.prototype.handleInput = function(tx, ty, tt, b1, b2) {
  var now = this.screen.now();
  var time = now - this.lastInputTime;
  this.lastInputTime = now;

  // If stun is one or higher, ignore input!
  var stun = this.bang.getValAtTime(now);
  var stunned = stun >= 1;
  if (tt && !stunned) {
    var body = this.screen.getBodyById(this.bodyId);
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

  // firing logic
  if (!stunned && b2) {
    // not stunned and the button is down
    if (!this.firing) {
      // either start firing or wait for timeout
      this.firing = true;
      if (this.fireReady) {
        this.fire();
      }
    }
  } else {
    this.firing = false;
  }
  if (!this.firing && tt && (tx || ty)) {
    this.fireVec.setXY(tx, -ty);
  }
};

PlayerSpirit.prototype.fire = function() {
  if (!this.fireReady) return;
  console.log("pew!");
  this.fireReady = false;
  this.screen.world.addTimeout(this.screen.now() + PlayerSpirit.FIRE_TIMEOUT,
      this.id, PlayerSpirit.FIRE_TIMEOUT_ID);
};

PlayerSpirit.prototype.onTimeout = function(world, spiritId, eventId) {
  var now = this.screen.now();
  if (eventId == PlayerSpirit.FRICTION_TIMEOUT_ID || eventId == -1) {
    var time = now - this.lastFrictionTime;
    this.lastFrictionTime = now;

    var body = this.screen.getBodyById(this.bodyId);

    this.newVel.set(body.vel);
    this.accel.set(this.newVel).scale(-PlayerSpirit.FRICTION);
    this.newVel.add(this.accel.scale(time));

    // Reset the body's pathDurationMax because it gets changed at compile-time,
    // but it is serialized at level-save-time, so old saved values might not
    // match the new compiled-in values. Hm.
    body.pathDurationMax = PlayerSpirit.FRICTION_TIMEOUT * 1.1;
    body.setVelAtTime(this.newVel, now);

    // TODO: put addTimeout in screen, remove world access
    world.addTimeout(now + PlayerSpirit.FRICTION_TIMEOUT, this.id, PlayerSpirit.FRICTION_TIMEOUT_ID);
  } else if (eventId == PlayerSpirit.FIRE_TIMEOUT_ID) {
    this.fireReady = true;
    if (this.firing) {
      this.fire();
    }
  }
};

PlayerSpirit.prototype.onDraw = function(world, renderer) {
  // TODO: replace world access with screen API?
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  var alertness = 1 - 0.7 * (this.bang.getValAtTime(this.screen.now()) / PlayerSpirit.MAX_BANG);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color).scale1(alertness));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toRotateZOp(-this.dir));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

PlayerSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
