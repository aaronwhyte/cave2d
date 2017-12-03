/**
 * Logic for deciding what to do in the game when two bodies touch.
 * @param screen  screen that's delegating its hit resolving biz
 * @param {HitResolver} bouncer  basic physics hitResolver
 * @constructor
 */
function Game4HitResolver(screen, bouncer) {
  this.screen = screen;
  this.bouncer = bouncer;
}

Game4HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1) {
  // TODO a bunch of other stuff like damage and death
  this.bouncer.resolveHit(time, collisionVec, b0, b1);
};

Game4HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
