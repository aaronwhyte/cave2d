/**
 * @constructor
 * @extends {Spirit}
 */
function ExitSpirit() {
  Spirit.call(this);
}
ExitSpirit.prototype = new Spirit();
ExitSpirit.prototype.constructor = ExitSpirit;

ExitSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  return Fracas2.Reaction.BOUNCE;
};
