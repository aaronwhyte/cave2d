/**
 * @constructor
 * @extends {Spirit}
 */
function BulletSpirit(game) {
  Spirit.call(this);
  this.reset(game);
}
BulletSpirit.prototype = new Spirit();
BulletSpirit.prototype.constructor = BulletSpirit;

Poolify(BulletSpirit);

BulletSpirit.TIMEOUT = 10;
BulletSpirit.RADIUS = 0.3;

BulletSpirit.prototype.reset = function(game) {
  this.game = game;
  this.bodyId = -1;
  this.id = -1;
  this.bounce = 0;
};

BulletSpirit.prototype.onTimeout = function(world, timeout) {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BulletSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  var otherSpirit = world.spirits[thatBody.spiritId];
  if (otherSpirit instanceof GnomeSpirit || otherSpirit instanceof GeneratorSpirit) {
    return Fracas2.Reaction.DESTROY_BULLET;
  }
  // Bounce off of walls if the angle of bounce is shallow, to allow touch-screen users to
  // fire shots down narrow hallways by glancing off the walls.
  var proj = Vec2d.alloc().set(thisBody.vel).projectOnto(hitEvent.collisionVec);
  var dot = thisBody.vel.dot(proj);
  var isGlance = (dot / thisBody.vel.magnitude()) < 0.1;
  if (!isGlance) {
    if (this.bounce <= 0) {
      return Fracas2.Reaction.DESTROY_BULLET;
    }
    this.bounce--;
  }
  return Fracas2.Reaction.BOUNCE;
};
