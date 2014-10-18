/**
 * Rayscan Request.
 * A rayscan is like a body that travels from pos to pos+vel, instantly,
 * reporting back on the first thing it hits.
 * @constructor
 */
function ScanRequest() {
  this.pos = new Vec2d();
  this.vel = new Vec2d();
  this.rectRad = new Vec2d();
  this.reset();
}

ScanRequest.prototype.reset = function() {
  this.hitGroup = -1;
  this.pos.reset();
  this.vel.reset();
  this.shape = Body.Shape.CIRCLE;
  this.rad = 1;
  this.rectRad.reset();
};

Poolify(ScanRequest);
