/**
 * @constructor
 * @extends {Spirit}
 */
function HealthSpirit() {
  Spirit.call(this);
}
HealthSpirit.prototype = new Spirit();
HealthSpirit.prototype.constructor = HealthSpirit;

HealthSpirit.prototype.onHit = function(world, thisBody, thatBody, hitEvent) {
  if (world.spirits[thatBody.spiritId] instanceof PlayerSpirit) {
    return Fracas2.Reaction.COLLECT_HEALTH;
  }
  return Fracas2.Reaction.BOUNCE;
};

