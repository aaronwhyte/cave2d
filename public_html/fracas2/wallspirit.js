/**
 * @constructor
 * @extends {Spirit}
 */
function WallSpirit() {
  Spirit.call(this);
}
WallSpirit.prototype = new Spirit();
WallSpirit.prototype.constructor = WallSpirit;

WallSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  return Fracas2.Reaction.BOUNCE;
};
