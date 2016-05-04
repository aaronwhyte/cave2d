/**
 * @constructor
 * @extends {Spirit}
 */
function BulletSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;

  this.type = BaseScreen.SpiritType.BULLET;
  this.id = -1;
  this.bodyId = -1;
  this.modelStamp = null;
  this.color = new Vec4();

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
BulletSpirit.prototype = new Spirit();
BulletSpirit.prototype.constructor = BulletSpirit;

BulletSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

BulletSpirit.getJsoner = function() {
  if (!BulletSpirit.jsoner) {
    BulletSpirit.jsoner = new Jsoner(BulletSpirit.SCHEMA);
  }
  return BulletSpirit.jsoner;
};

BulletSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BulletSpirit.createModel = function() {
  return RigidModel.createCircleMesh(3)
      .setColorRGB(1, 1, 1);
};

BulletSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

BulletSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  // Render the smaller ones in front.
  // TODO: standardize Z
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

BulletSpirit.prototype.onTimeout = function(world, timeout) {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BulletSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};


BulletSpirit.prototype.toJSON = function() {
  return BulletSpirit.getJsoner().toJSON(this);
};

BulletSpirit.prototype.setFromJSON = function(json) {
  BulletSpirit.getJsoner().setFromJSON(json, this);
};

