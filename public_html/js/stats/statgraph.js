/**
 * @param {StatTrail} trail
 * @param {LineDrawer} lineDrawer
 * @constructor
 */
function StatGraph(trail, lineDrawer) {
  this.trail = trail;
  this.lineDrawer = lineDrawer;
}

/**
 * @param {number} now subtracted from all time values
 * @param {number} z
 * @param {number} r
 */
StatGraph.prototype.draw = function(now, z, r) {
  for (var i = 0, n = this.trail.size(); i < n; i++) {
    var x = this.trail.getTime(i) - now;
    var y = this.trail.getVal(i);
    if (i == 0) {
      this.lineDrawer.moveToXYZR(x, y, z, r);
    } else {
      this.lineDrawer.lineToXYZR(x, y, z, r);
    }
  }
};
