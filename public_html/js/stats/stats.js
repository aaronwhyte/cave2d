/**
 * statName/number pairs for tracking current values, without history. Kinda dumb.
 * This acts like everything has been initialized to zero.
 * @constructor
 */
function Stats() {
  this.vals = {};
}

Stats.prototype.inc = function(statName) {
  this.add(statName, 1);
  return this;
};

Stats.prototype.dec = function(statName) {
  this.add(statName, -1);
  return this;
};

Stats.prototype.add = function(statName, x) {
  this.vals[statName] = this.vals[statName] ? this.vals[statName] + x : x;
  return this;
};

Stats.prototype.set = function(statName, x) {
  this.vals[statName] = (Number)(x) || 0;
  return this;
};

Stats.prototype.get = function(statName) {
  return this.vals[statName] || 0;
};
