/**
 * @constructor
 * @extends {Spirit}
 */
function BrickSpirit() {
  Spirit.call(this);
}
BrickSpirit.prototype = new Spirit();
BrickSpirit.prototype.constructor = BrickSpirit;

BrickSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  if (world.spirits[thatBody.spiritId] instanceof BulletSpirit) {
//    var proj = Vec2d.alloc().set(thatBody.vel).projectOnto(hitEvent.collisionVec);
//    var dot = thatBody.vel.dot(proj);
//    var glance = dot / thatBody.vel.magnitude();
//    if (glance > 0.7) {
      return Fracas2.Reaction.DESTROY_BRICK;
//    }
  }
  return Fracas2.Reaction.BOUNCE;
};
