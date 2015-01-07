/**
 * @constructor
 * @extends {Spirit}
 */
function BrickSpirit() {
  Spirit.call(this);
  this.health = 3;
}
BrickSpirit.prototype = new Spirit();
BrickSpirit.prototype.constructor = BrickSpirit;

BrickSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  if (world.spirits[thatBody.spiritId] instanceof BulletSpirit) {
    this.health--;
    if (this.health <= 0) return Fracas2.Reaction.DESTROY_BRICK;
  }
  return Fracas2.Reaction.BOUNCE;
};
