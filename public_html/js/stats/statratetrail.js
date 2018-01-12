/**
 * A StatTrail that records the rate of change of a stat, not the values themselves.
 * It takes two samples to get the first rate.
 * @param {Number} length
 * @constructor
 * @extends {StatTrail}
 */
function StatRateTrail(length) {
  StatTrail.call(this, length);
  this.lastTime = null;
  this.lastVal = null;
}
StatRateTrail.prototype = new StatTrail();
StatRateTrail.prototype.constructor = StatRateTrail;

StatRateTrail.prototype.sample = function(newTime, newVal) {
  if (this.lastTime !== null) {
    let timeDiff = newTime - this.lastTime;
    if (timeDiff !== 0) {
      let rate = (newVal - this.lastVal) / timeDiff;
      this.enqueueTimeAndValue(newTime, rate);
    }
  }
  this.lastTime = newTime;
  this.lastVal = newVal;
};
