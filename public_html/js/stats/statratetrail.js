/**
 * A StatTrail that records the rate of change of a stat, not the values themselves.
 * It tales two samples to get thr first rate.
 * @param {Stats} stats
 * @param {String} statName
 * @param {Number} length
 * @constructor
 * @extends {StatTrail}
 */
function StatRateTrail(stats, statName, length) {
  StatTrail.call(this, stats, statName, length);
  this.lastTime = null;
  this.lastVal = null;
}
StatRateTrail.prototype = new StatTrail();
StatRateTrail.prototype.constructor = StatRateTrail;

StatRateTrail.prototype.sample = function(newTime) {
  var newVal = this.stats.get(this.statName);
  if (this.lastTime !== null) {
    var timeDiff = newTime - this.lastTime;
    if (timeDiff !== 0) {
      var rate = (newVal - this.lastVal) / timeDiff;
      this.vals.enqueue(rate);
      this.times.enqueue(newTime);
    }
  }
  this.lastTime = newTime;
  this.lastVal = newVal;
};
