/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ExitSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game2BaseScreen.SpiritType.EXIT;

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
ExitSpirit.prototype = new BaseSpirit();
ExitSpirit.prototype.constructor = ExitSpirit;

ExitSpirit.TIMEOUT = 2;

ExitSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

ExitSpirit.createModel = function() {
  return RigidModel.createSquare().setColorRGB(0.3, 1, 0.3);
};

ExitSpirit.factory = function(screen, pos) {
  var world = screen.world;

  var spirit = new ExitSpirit(screen);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosAtTime(pos, screen.now());
  b.rectRad.setXY(1.5, 1.5);
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

ExitSpirit.prototype.onTimeout = function(world, timeoutVal) {
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
  world.addTimeout(world.now + ExitSpirit.TIMEOUT, this.id, -1);
};

ExitSpirit.getJsoner = function() {
  if (!ExitSpirit.jsoner) {
    ExitSpirit.jsoner = new Jsoner(ExitSpirit.SCHEMA);
  }
  return ExitSpirit.jsoner;
};

ExitSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ExitSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody();
  var bodyPos = this.getBodyPos();
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(Renderer.COLOR_WHITE);
  // TODO: standardize Z
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.5))
      .multiply(this.mat44.toScaleOpXYZ(body.rectRad.x, body.rectRad.y, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

ExitSpirit.prototype.toJSON = function() {
  return ExitSpirit.getJsoner().toJSON(this);
};

ExitSpirit.prototype.setFromJSON = function(json) {
  ExitSpirit.getJsoner().setFromJSON(json, this);
};
