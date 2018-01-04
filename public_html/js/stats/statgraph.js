/**
 * @param {StatTrail} trail
 * @param {Renderer} renderer
 * @param {Cuboid} cuboid
 * @constructor
 */
function StatGraph(trail, renderer, cuboid) {
  this.trail = trail;
  this.renderer = renderer;
  this.cuboid = cuboid;

  this.timespan = 100;
  this.minVal = 0;
  this.maxVal = 99;
  this.vec4 = new Vec4();
  this.lineWidth = 2;

  this.m = new Matrix44();
  this.m2 = new Matrix44();

  this.stamp = RigidModel.createStatGraphSegmentPile(Renderer.POLY_LINE_POINT_COUNT)
      .createModelStamp(renderer.gl);
}

StatGraph.prototype.setTimespan = function(timespan) {
  this.timespan = timespan;
  return this;
};

StatGraph.prototype.setValueRange = function(minVal, maxVal) {
  this.minVal = minVal;
  this.maxVal = maxVal;
  return this;
};

/**
 * @param {Cuboid} cuboid  this reference is retained - this doesn't copy the values out
 * @returns {StatGraph}
 */
StatGraph.prototype.setCuboid = function(cuboid) {
  this.cuboid = cuboid;
  return this;
};

/**
 * Draws the graph lines using the current color and viewMatrix.
 * @param {number} now  The current time, to offset all the time values.
 */
StatGraph.prototype.draw = function(now) {
  // Z is the closest face of the cuboid.
  let z = this.cuboid.pos.getZ() + this.cuboid.rad.getZ();
  let midVal = (this.minVal + this.maxVal) / 2;
  let valspan = this.maxVal - this.minVal;
  let midTime = now - this.timespan / 2;
  let cPos = this.cuboid.pos;
  let cRad = this.cuboid.rad;

  this.m.toIdentity()
      .multiply(this.m2.toTranslateOpXYZ(cPos.getX(), cPos.getY(), z))
      .multiply(this.m2.toScaleOpXYZ(cRad.getX() * 2 / this.timespan, -cRad.getY() * 2 / valspan, 1))
      .multiply(this.m2.toTranslateOpXYZ(-midTime, -midVal, 0));
  this.renderer
      .setPolyLineMode()
      .setModelMatrix(this.m)
      .setStamp(this.stamp)
      .setPolyLineCircularQueue(this.trail.getAllPairs(), this.trail.getHeadIndex(), this.trail.size())
      .drawStamp()
      .setNormalMode(); // TODO maybe push polyline mode and then pop it? Something else?
};
