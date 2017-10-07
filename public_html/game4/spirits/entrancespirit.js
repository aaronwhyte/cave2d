/**
 * @constructor
 * @extends {BaseSpirit}
 */
function EntranceSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game4BaseScreen.SpiritType.ENTRANCE;

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
EntranceSpirit.prototype = new BaseSpirit();
EntranceSpirit.prototype.constructor = EntranceSpirit;

EntranceSpirit.TIMEOUT = 2;

EntranceSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

EntranceSpirit.createModel = function() {
  return RigidModel.createRingMesh(5, 0.8)
      .setColorRGB(0.7, 0.3, 0.7);
};

EntranceSpirit.factory = function(screen, stamp, pos) {
  var world = screen.world;

  var spirit = new EntranceSpirit(screen);
  spirit.setModelStamp(stamp);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, screen.now());
  b.rad = 4;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

EntranceSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  var body = this.getBody();
  body.pathDurationMax = Infinity;
  // If the body is being moved (because it's in the editor), slow it to a stop.
  if (!body.vel.isZero()) {
    var friction = 0.5;
    var newVel = this.vec2d.set(body.vel).scale(1 - friction);
    if (newVel.magnitudeSquared() < 0.01) {
      newVel.reset();
    }
    body.setVelAtTime(newVel, world.now);
  }
  world.addTimeout(world.now + EntranceSpirit.TIMEOUT, this.id, -1);

  if (Math.random() < 1) {
    this.screen.addPortalMoteSplash(this.getBodyPos(), 0, body.rad * 0.9);
  }
};

EntranceSpirit.getJsoner = function() {
  if (!EntranceSpirit.jsoner) {
    EntranceSpirit.jsoner = new Jsoner(EntranceSpirit.SCHEMA);
  }
  return EntranceSpirit.jsoner;
};

EntranceSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

EntranceSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var bodyPos = this.getBodyPos();
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(Renderer.COLOR_WHITE);
  // TODO: standardize Z
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0.5))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

EntranceSpirit.prototype.toJSON = function() {
  return EntranceSpirit.getJsoner().toJSON(this);
};

EntranceSpirit.prototype.setFromJSON = function(json) {
  EntranceSpirit.getJsoner().setFromJSON(json, this);
};
