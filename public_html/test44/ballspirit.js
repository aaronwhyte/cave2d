/**
 * @constructor
 * @extends {BaseSpirit}
 */
function BallSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Test44BaseScreen.SpiritType.BALL;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
BallSpirit.prototype = new BaseSpirit();
BallSpirit.prototype.constructor = BallSpirit;

BallSpirit.MEASURE_TIMEOUT = 3;
BallSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
BallSpirit.STOPPING_ANGVEL = 0.01;

BallSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

BallSpirit.getJsoner = function() {
  if (!BallSpirit.jsoner) {
    BallSpirit.jsoner = new Jsoner(BallSpirit.SCHEMA);
  }
  return BallSpirit.jsoner;
};

BallSpirit.prototype.toJSON = function() {
  return BallSpirit.getJsoner().toJSON(this);
};

BallSpirit.prototype.setFromJSON = function(json) {
  BallSpirit.getJsoner().setFromJSON(json, this);
};

BallSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BallSpirit.createModel = function() {
  var rm = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  for (var i = 0; i < rm.vertexes.length; i++) {
    var v = rm.vertexes[i];
    var z = (-v.position.getZ()) / 2 + 0.5;
    var spot = 1;
    if (Math.random() < 0.2) {
      spot = spot ? 0 : 1;
    }
    v.color.setXYZ(z, z * (1-spot), z);
  }
  return rm;
};

BallSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new BallSpirit(screen);
  spirit.setModelStamp(stamp);
  var density = 0.1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 1;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 1 + 2 * Math.random();
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = 2/3 * b.mass * b.rad * b.rad;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

BallSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BallSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  var pos = this.getBodyPos();

  var friction = 0.01;
  var now = this.now();
  var time = Math.max(0, Math.min(BallSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);

  var newVel = this.vec2d.set(body.vel);

  var oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < BallSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  var oldVelMagSq = newVel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < BallSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  timeoutDuration = BallSpirit.MEASURE_TIMEOUT * (0.2 * Math.random() + 0.9);
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

BallSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(pos.x, pos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};
