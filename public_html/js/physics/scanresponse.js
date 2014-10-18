/**
 * A ScanResponse holds the result of a World.rayscan.
 * @constructor
 */
function ScanResponse() {
  this.collisionVec = new Vec2d();
  this.reset();
}

ScanResponse.prototype.reset = function() {
  this.time = 0;
  this.pathId = 0;
  this.collisionVec.reset();
};

Poolify(ScanResponse);
