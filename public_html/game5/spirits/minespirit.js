/**
 * @constructor
 * @extends {BaseSpirit}
 */
function MineSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5Key.MINE;
  this.team = Team.NEUTRAL;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  // combat
  this.toughness = 0.1;
  this.damage = 0;

  this.inventory = new Inventory();
}
MineSpirit.prototype = new BaseSpirit();
MineSpirit.prototype.constructor = MineSpirit;

MineSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

MineSpirit.MINE_RAD = 0.8;

MineSpirit.factory = function(screen, pos, dir) {
  let spirit = new MineSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let spiritId = screen.world.addSpirit(spirit);
  let b = spirit.createBody(pos, dir);
  spirit.bodyId = screen.world.addBody(b);
  return spiritId;
};

MineSpirit.prototype.createBody = function(pos, dir) {
  let density = 1;
  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.now());
  b.setAngPosAtTime(dir, this.now());
  b.rad = MineSpirit.MINE_RAD;
  b.hitGroup = HitGroups.NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;

  b.turnable = true;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.grip = 0.3;
  b.elasticity = 0.25;
  b.pathDurationMax = MineSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

MineSpirit.prototype.die = function() {
  let pos = this.getBodyPos();
  this.sounds.playerExplode(pos);
  this.screen.addPlayerExplosionSplash(pos, this.color);
  this.screen.removeByBodyId(this.bodyId);
};

// /**
//  * Called after bouncing and damage exchange are done.
//  * @param {Vec2d} collisionVec
//  * @param {Number} mag the magnitude of the collision, kinda?
//  * @param {Body} otherBody
//  * @param {Spirit} otherSpirit
//  */
// MineSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
//   BaseSpirit.prototype.onHitOther.apply(this, arguments);
//   //this.screen.addPlayerExplosionSplash(this.getBodyPos(), this.color);
// };
