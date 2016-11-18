/**
 * @param {StatTrail} trail
 * @param {LineDrawer} lineDrawer
 * @constructor
 */
function StatGraph(trail, lineDrawer) {
  this.trail = trail;
  this.lineDrawer = lineDrawer;
  this.timespan = 100;
  this.minVal = 0;
  this.maxVal = 99;
  this.rect = new Rect(50, 50, 50, 50);
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

StatGraph.prototype.setDrawRect = function(rect) {
  this.rect.set(rect);
  return this;
};

/**
 * @param {number} now subtracted from all time values
 * @param {number} z
 * @param {number} r
 */
StatGraph.prototype.draw = function(now, z) {
  this.lineDrawer.nextZ = z;
  this.lineDrawer.nextLineThickness = this.lineWidth;

  var minX = this.rect.getMinX();
  var maxX = this.rect.getMaxX();

  var topY = this.rect.getMinY();
  var bottomY = this.rect.getMaxY();

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
