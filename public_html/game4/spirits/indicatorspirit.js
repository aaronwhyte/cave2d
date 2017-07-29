/**
 * @constructor
 * @extends {BaseSpirit}
 */
function IndicatorSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.INDICATOR;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.viewportsFromCamera = 0;
}
IndicatorSpirit.prototype = new BaseSpirit();
IndicatorSpirit.prototype.constructor = IndicatorSpirit;

IndicatorSpirit.MEASURE_TIMEOUT = 1.2;
IndicatorSpirit.MAX_TIMEOUT = 10;

IndicatorSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

IndicatorSpirit.getJsoner = function() {
  if (!IndicatorSpirit.jsoner) {
    IndicatorSpirit.jsoner = new Jsoner(IndicatorSpirit.SCHEMA);
  }
  return IndicatorSpirit.jsoner;
};

IndicatorSpirit.prototype.toJSON = function() {
  return IndicatorSpirit.getJsoner().toJSON(this);
};

IndicatorSpirit.prototype.setFromJSON = function(json) {
  IndicatorSpirit.getJsoner().setFromJSON(json, this);
};

IndicatorSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

IndicatorSpirit.createModel = function() {
  return RigidModel.createCircle(17)
      .setColorRGB(0.9, 0.9, 0.9);
};

IndicatorSpirit.factory = function(screen, stamp, pos, dir) {
  var world = screen.world;

  var spirit = new IndicatorSpirit(screen);
  spirit.setModelStamp(stamp);
  spirit.setColorRGB(1, 1, 1);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.9;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.7;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(screen.now(), spiritId, -1);
  return spiritId;
};

IndicatorSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

IndicatorSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.stress = this.stress || 0;

  var friction = this.screen.isPlaying() ? 0.05 : 0.3;

  var now = this.now();
  var time = IndicatorSpirit.MEASURE_TIMEOUT;

  // friction
  body.applyLinearFrictionAtTime(friction * time, now);
  body.applyAngularFrictionAtTime(friction * time, now);

  var newVel = this.vec2d.set(body.vel);

  var oldAngVelMag = Math.abs(this.getBodyAngVel());
  if (oldAngVelMag && oldAngVelMag < IndicatorSpirit.STOPPING_ANGVEL) {
    this.setBodyAngVel(0);
  }
  var oldVelMagSq = newVel.magnitudeSquared();
  if (oldVelMagSq && oldVelMagSq < IndicatorSpirit.STOPPING_SPEED_SQUARED) {
    newVel.reset();
  }

  // Reset the body's pathDurationMax because it gets changed at compile-time,
  // but it is serialized at level-save-time, so old saved values might not
  // match the new compiled-in values. Hm.
  var timeoutDuration;
  timeoutDuration = Math.min(
      IndicatorSpirit.MAX_TIMEOUT,
      IndicatorSpirit.MEASURE_TIMEOUT * Math.max(1, this.viewportsFromCamera) * (0.2 * Math.random() + 0.9));
  body.pathDurationMax = timeoutDuration * 1.1;
  body.setVelAtTime(newVel, now);
  body.invalidatePath();
  world.addTimeout(now + timeoutDuration, this.id, -1);
};

IndicatorSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var pos = this.getBodyPos();
  this.viewportsFromCamera = this.screen.approxViewportsFromCamera(pos);
  if (!IndicatorSpirit.OPTIMIZE || this.viewportsFromCamera < 1.1) {
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
