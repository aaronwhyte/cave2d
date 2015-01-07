/**
 * @constructor
 * @extends {Spirit}
 */
function GoldSpirit() {
  Spirit.call(this);
}
GoldSpirit.prototype = new Spirit();
GoldSpirit.prototype.constructor = GoldSpirit;

GoldSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  if (world.spirits[thatBody.spiritId] instanceof PlayerSpirit) {
    return Fracas2.Reaction.COLLECT_GOLD;
  }
  return Fracas2.Reaction.BOUNCE;
};

