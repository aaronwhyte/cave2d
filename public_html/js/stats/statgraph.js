/**
 * @param {StatTrail} trail
 * @param {LineDrawer} lineDrawer
 * @param {Cuboid} cuboid
 * @constructor
 */
function StatGraph(trail, lineDrawer, cuboid) {
  this.trail = trail;
  this.lineDrawer = lineDrawer;
  this.cuboid = cuboid;

  this.timespan = 100;
  this.minVal = 0;
  this.maxVal = 99;
  this.vec4 = new Vec4();
  this.lineWidth = 2;
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
 * @param {number} now subtracted from all time values
 */
StatGraph.prototype.draw = function(now) {
  // Z is the closest face of the cuboid.
  this.lineDrawer.nextZ = this.cuboid.pos.getZ() + this.cuboid.rad.getZ();
  this.lineDrawer.nextLineThickness = this.lineWidth;

  this.cuboid.getMinCorner(this.vec4);
  var minX = this.vec4.getX();
  var topY = this.vec4.getY();

  this.cuboid.getMaxCorner(this.vec4);
  var maxX = this.vec4.getX();
  var bottomY = this.vec4.getY();

  var timeCoef = (maxX - minX) / this.timespan;
  var valCoef = (bottomY - topY) / (this.maxVal - this.minVal);

  for (var i = 0, n = this.trail.size(); i < n; i++) {
    var x = (this.trail.getTime(i) - now) * timeCoef + maxX;
    var y = -(this.trail.getVal(i) - this.minVal) * valCoef + bottomY;
    if (i == 0) {
      this.lineDrawer.moveToXY(x, y);
    } else {
      this.lineDrawer.lineToXY(x, y);
    }
  }
};
