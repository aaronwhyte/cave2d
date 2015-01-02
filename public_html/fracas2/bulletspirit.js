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

BulletSpirit.TIMEOUT = 20;
BulletSpirit.MAX_HITS = 4;

BulletSpirit.prototype.reset = function(game) {
  this.game = game;
  this.bodyId = -1;
  this.id = -1;
  this.hits = 0;
};

BulletSpirit.prototype.onTimeout = function(world, timeout) {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BulletSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  var otherSpirit = world.spirits[thatBody.spiritId];
  if (otherSpirit instanceof GnomeSpirit) {
    return Fracas2.Reaction.DESTROY_BULLET;
  }
  // Bounce off of walls if the angle of bounce is shallow, to allow touch-screen users to
  // fire shots down narrow hallways by glancing off the walls.
  if (otherSpirit instanceof WallSpirit) {
    var proj = Vec2d.alloc().set(thisBody.vel).projectOnto(hitEvent.collisionVec);
    var dot = thisBody.vel.dot(proj);
    var glance = dot / thisBody.vel.magnitude();
    if (glance > 0.7) {
      return Fracas2.Reaction.DESTROY_BULLET;
    }
  }
  this.hits++;
  if (this.hits >= BulletSpirit.MAX_HITS) {
    return Fracas2.Reaction.DESTROY_BULLET;
  }
  return Fracas2.Reaction.BOUNCE;
};
