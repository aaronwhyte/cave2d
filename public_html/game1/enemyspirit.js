/**
 * @constructor
 * @extends {Spirit}
 */
function EnemySpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.color = new Vec4();
  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.turn = 0;
}
EnemySpirit.prototype = new Spirit();
EnemySpirit.prototype.constructor = EnemySpirit;

EnemySpirit.MOVE_TIMEOUT = 5;
EnemySpirit.FIRE_TIMEOUT = 100;
EnemySpirit.BULLET_SPEED = 10;

EnemySpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

EnemySpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

EnemySpirit.prototype.onTimeout = function(world) {
  var body = this.getBody(world);
  var friction = Vec2d.alloc().set(body.vel).scale(-0.04);
  // turn, but gradually correct to straight-ahead
  this.turn += (Math.random() - 0.5) * 0.2;
  this.turn *= 0.99;
  // do the turn and also jiggle a bit
  var thrust = Vec2d.alloc()
      .set(body.vel).scaleToLength(0.07).rot(this.turn)
      .addXY((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
  body.setVelAtTime(body.vel
      .add(friction.scale(EnemySpirit.MOVE_TIMEOUT))
      .add(thrust.scale(EnemySpirit.MOVE_TIMEOUT)),
      world.now);
  friction.free();
  thrust.free();

  if (!this.fireTime) {
    this.fireTime = world.now + (Math.random() + 0.1) * EnemySpirit.FIRE_TIMEOUT;
  }
  if (world.now > this.fireTime) {
    body.getPosAtTime(world.now, this.tempBodyPos);
    var vecToPlayer = this.playScreen.scanForPlayer(this.tempBodyPos, this.vec2d);
    if (vecToPlayer) {
      this.playScreen.enemyFire(this.tempBodyPos, vecToPlayer.scaleToLength(EnemySpirit.BULLET_SPEED));
    }
    this.fireTime = world.now + (Math.random() + 0.5) * EnemySpirit.FIRE_TIMEOUT;
  }

  var wait = EnemySpirit.MOVE_TIMEOUT - Math.random();
  world.addTimeout(world.now + wait, this.id);
};

EnemySpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

EnemySpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};
