/**
 * A stat provides calculates the rate of change of some value over time.
 * It takes two samples to get the first rate.
 * @constructor
 */
function RateStat() {
  this.lastTime = null;
  this.lastValue = null;
  this.rate = null;
}

RateStat.prototype.sample = function(time, value) {
  if (this.lastTime !== null) {
    let timeDiff = time - this.lastTime;
    if (timeDiff !== 0) {
      this.rate = (value - this.lastValue) / timeDiff;
    }
  }
  this.lastTime = time;
  this.lastValue = value;
};

RateStat.prototype.getValue = function() {
  return this.rate || 0;
};
