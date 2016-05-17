/**
 * @param {Number} decayRate
 * @param {Number} maxVal
 * @constructor
 */
function BangVal(decayRate, maxVal) {
  this.decayRate = decayRate;
  this.maxVal = maxVal;
  this.val = 0;
  this.atTime = 0;
}

BangVal.prototype.getValAtTime = function(t) {
  return Math.min(this.maxVal, Math.max(0, this.val - this.decayRate * (t - this.atTime)));
};

BangVal.prototype.setValAtTime = function(v, t) {
  this.val = Math.min(v, this.maxVal);
  this.atTime = t;
  return this;
};

BangVal.prototype.addValAtTime = function(v, t) {
  this.setValAtTime(this.getValAtTime(t) + v, t);
  return this;
};
