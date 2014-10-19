/**
 * A ScanResponse holds the result of a World.rayscan.
 * @constructor
 */
function ScanResponse() {
  this.collisionVec = new Vec2d();
  this.reset();
}

ScanResponse.prototype.reset = function() {
  this.timeOffset = 0; // zero to one
  this.pathId = 0;
  this.collisionVec.reset();
};

Poolify(ScanResponse);
