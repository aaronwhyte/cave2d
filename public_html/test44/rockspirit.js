/**
 * @constructor
 * @extends {BaseSpirit}
 */
function RockSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Test44BaseScreen.SpiritType.ROCK;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
RockSpirit.prototype = new BaseSpirit();
RockSpirit.prototype.constructor = RockSpirit;

RockSpirit.MEASURE_TIMEOUT = 3;
RockSpirit.STOPPING_SPEED_SQUARED = 0.01 * 0.01;
RockSpirit.STOPPING_ANGVEL = 0.01;

RockSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

RockSpirit.getJsoner = function() {
  if (!RockSpirit.jsoner) {
    RockSpirit.jsoner = new Jsoner(RockSpirit.SCHEMA);
  }
  return RockSpirit.jsoner;
};

RockSpirit.prototype.toJSON = function() {
  return RockSpirit.getJsoner().toJSON(this);
};

RockSpirit.prototype.setFromJSON = function(json) {
  RockSpirit.getJsoner().setFromJSON(json, this);
};

RockSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

RockSpirit.createModel = function() {
  var rm = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  for (var i = 0; i < rm.vertexes.length; i++) {
    var v = rm.vertexes[i];
    var distort = 0.06;
    v.position.scale1(Math.random() * 2 * distort + (1 - distort));
    var z = (-v.position.getZ()) * 0.7 + 0.3;
    v.color.setXYZ(z, z, z);
  }
  return rm;
};

RockSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new RockSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(0.7, 0.7, 0.8);
  var density = 3;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.8;
  b.elasticity = 0.4;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.6 + Math.random();
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad * 2/5;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

RockSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

RockSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  var pos = this.getBodyPos();

  var friction = 0.01;
  var now = this.now();
  var time = Math.max(0, Math.min(RockSpirit.MEASURE_TIMEOUT, now - this.lastControlTime));
  this.lastControlTime = now;

  // friction
  body.applyLinearFrictionAtTime(friction, now);
  body.applyAngularFrictionAtTime(friction, now);

  var newVel = this.vec2d.set(body.vel);

  var oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < RockSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  var oldVelMagSq = newVel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < RockSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }
  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  timeoutDuration = RockSpirit.MEASURE_TIMEOUT * (0.2 * Math.random() + 0.9);
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

RockSpirit.prototype.onDraw = function(world, renderer) {
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
