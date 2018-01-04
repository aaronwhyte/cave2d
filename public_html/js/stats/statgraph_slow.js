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
  let minX = this.vec4.getX();
  let topY = this.vec4.getY();

  this.cuboid.getMaxCorner(this.vec4);
  let maxX = this.vec4.getX();
  let bottomY = this.vec4.getY();

  let timeCoef = this.timespan ? (maxX - minX) / this.timespan : 0;
  let valCoef = (bottomY - topY) / (this.maxVal - this.minVal);

  for (let i = 0, n = this.trail.size(); i < n; i++) {
    let x = (this.trail.getTime(i) - now) * timeCoef + maxX;
    let y = -(this.trail.getVal(i) - this.minVal) * valCoef + bottomY;
    if (i === 0) {
      this.lineDrawer.moveToXY(x, y);
      if (n === 1) {
        // draw a dot if there's just one data point
        this.lineDrawer.lineToXY(x, y);
      }
    } else {
      this.lineDrawer.lineToXY(x, y);
    }
  }
};
