/**
 * @constructor
 * @extends {Spirit}
 */
function AntSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = PlayScreen.SpiritType.ANT;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);
  // 0 is up, PI/2 is right
  this.dir = 0;//Math.random() * Math.PI * 2;
  this.angVel = 0;
  this.stress = 0;

  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.scanVec = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
AntSpirit.prototype = new Spirit();
AntSpirit.prototype.constructor = AntSpirit;

AntSpirit.MEASURE_TIMEOUT = 0.5;

AntSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "dir",
  5: "angVel",
  6: "stress"
};

AntSpirit.getJsoner = function() {
  if (!AntSpirit.jsoner) {
    AntSpirit.jsoner = new Jsoner(AntSpirit.SCHEMA);
  }
  return AntSpirit.jsoner;
};

AntSpirit.prototype.toJSON = function() {
  return AntSpirit.getJsoner().toJSON(this);
};

AntSpirit.prototype.setFromJSON = function(json) {
  AntSpirit.getJsoner().setFromJSON(json, this);
};

AntSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

AntSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

AntSpirit.prototype.scan = function(pos, rot, dist, rad) {
  return this.playScreen.scan(
      PlayScreen.Group.ROCK,
      pos,
      this.scanVec.setXY(
          Math.sin(this.dir + rot) * dist,
          Math.cos(this.dir + rot) * dist),
      rad);
};

AntSpirit.prototype.onTimeout = function(world, event) {
  this.stress = this.stress || 0;
  var body = this.getBody(world);
  var pos = body.getPosAtTime(world.now, this.tempBodyPos);
  var basicThrust = 0.04;
  var maxTurn = 0.07;
  var thrust = basicThrust;
  var friction = 0.08;

  var antennaRot = Math.PI / 3.5;
  var scanDist = body.rad * 5;
  var turn = 0;
  var dist;
  var seen = 0;
  var scanRot;
  scanRot = antennaRot * (Math.random() - 0.5);
  dist = this.scan(pos, scanRot, scanDist, body.rad/2);
  if (dist >= 0) {
    seen++;
    if (scanRot > 0) {
      turn += maxTurn * (-antennaRot/2 - scanRot) * (1 - dist/2);
    } else {
      turn += maxTurn * (antennaRot/2 - scanRot) * (1 - dist/2);
    }
    thrust -= basicThrust * (1 - dist);
  }
  if (seen) {
    this.stress += 0.01;
  } else {
    this.stress -= 0.1;
  }
  this.stress = Math.max(1, Math.max(0, this.stress));
  //this.dir += 0.01 * (Math.random() - 0.5);
  this.angVel *= 0.90;
  this.angVel += turn * (1 + 0*this.stress);
  if (this.angVel > Math.PI/2) this.angVel = Math.PI/2;
  if (this.angVel < -Math.PI/2) this.angVel = -Math.PI/2;
  this.dir += this.angVel;
  var newVel = this.vec2d
    .set(body.vel).scale(1 - friction)
    .addXY(Math.sin(this.dir) * thrust, Math.cos(this.dir) * thrust);
  body.setVelAtTime(newVel, world.now);
  world.addTimeout(world.now + AntSpirit.MEASURE_TIMEOUT * (Math.random() + 0.5), this.id, -1);
};

AntSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1))
      .multiply(this.mat44.toRotateZOp(-this.dir));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

AntSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
