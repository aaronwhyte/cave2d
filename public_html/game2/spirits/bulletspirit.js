/**
 * @constructor
 * @extends {Spirit}
 */
function BulletSpirit(screen) {
  Spirit.call(this);
  this.screen = screen;

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

  this.lastTrailPos = new Vec2d();
  this.trailStarted = false;
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

  this.drawTrail();
};

BulletSpirit.prototype.drawTrail = function() {
  var body = this.getBody(this.screen.world);
  var bodyPos = body.getPosAtTime(this.screen.now(), this.vec2d);
  var s = this.screen.splash;
  s.reset(BaseScreen.SplashType.MUZZLE_FLASH, this.screen.soundStamp); // TODO??

  s.startTime = this.screen.now();
  s.duration = 2;

  var p1 = Vec2d.alloc();
  var p2 = Vec2d.alloc();

  p1.set(bodyPos);
  p2.set(this.trailStarted ? this.lastTrailPos : bodyPos);
  this.trailStarted = true;
  this.lastTrailPos.set(bodyPos);

  var thickness = body.rad;

  s.startPose.pos.setXYZ(p1.x, p1.y, 0);
  s.endPose.pos.setXYZ(p1.x, p1.y, 0.5);
  s.startPose.scale.setXYZ(thickness, thickness, 1);
  s.endPose.scale.setXYZ(thickness, thickness, 1);

  s.startPose2.pos.setXYZ(p2.x, p2.y, 0);
  s.endPose2.pos.setXYZ(p2.x, p2.y, 0.5);
  s.startPose2.scale.setXYZ(thickness, thickness, 1);
  s.endPose2.scale.setXYZ(thickness, thickness, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.setXYZ(1, 0.3, 0.6).scale1(0.5);
  s.endColor.setXYZ(1, 0.3, 0.6).scale1(0.5);

  this.screen.splasher.addCopy(s);

  p1.free();
  p2.free();

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

