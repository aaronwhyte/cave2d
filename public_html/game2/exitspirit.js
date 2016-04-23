/**
 * @constructor
 * @extends {Spirit}
 */
function ExitSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;

  this.type = BaseScreen.SpiritType.EXIT;
  this.id = -1;
  this.bodyId = -1;
  this.modelStamp = null;

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
ExitSpirit.prototype = new Spirit();
ExitSpirit.prototype.constructor = ExitSpirit;

ExitSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

ExitSpirit.createModel = function() {
  return RigidModel.createSquare().setColorRGB(0.3, 1, 0.3);
};

ExitSpirit.factory = function(screen, stamp, pos) {
  var world = screen.world;

  var spirit = new ExitSpirit(screen);
  spirit.setModelStamp(stamp);
  var density = 1;

  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosAtTime(pos, screen.now());
  b.rectRad.setXY(1.5, 1.5);
  b.hitGroup = BaseScreen.Group.ROCK;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
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
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
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

ExitSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};


ExitSpirit.prototype.toJSON = function() {
  return ExitSpirit.getJsoner().toJSON(this);
};

ExitSpirit.prototype.setFromJSON = function(json) {
  ExitSpirit.getJsoner().setFromJSON(json, this);
};
