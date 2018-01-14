/**
 * Exponental moving average, basically. New are mixed with the decayed old average.
 * @param {number} decay between 0 and 1. Smaller decay makes the value change more slowly.
 * @constructor
 */
function MovingAverageStat(decay) {
  this.decay = decay;
  this.lastTime = null;
  this.avg = null;
}

MovingAverageStat.prototype.sample = function(time, value) {
  if (this.avg === null) {
    this.avg = value;
  } else {
    let timeDiff = time - this.lastTime;
    let decay = Math.pow(this.decay, timeDiff);
    this.avg = this.avg * decay + value * (1 - decay);
  }
  this.lastTime = time;
};

MovingAverageStat.prototype.getValue = function() {
  return this.avg || 0;
};
