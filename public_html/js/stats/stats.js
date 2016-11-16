/**
 * Key/number pairs for tracking current values, without history. Kinda dumb.
 * This acts like everything has been initialized to zero.
 * @constructor
 */
function Stats() {
  this.vals = {};
}

Stats.prototype.inc = function(key) {
  this.add(key, 1);
};

Stats.prototype.dec = function(key) {
  this.add(key, -1);
};

Stats.prototype.add = function(key, x) {
  this.maybeZero(key);
  this.vals[key] += x;
};

Stats.prototype.set = function(key, x) {
  this.vals[key] = (Number)(x) || 0;
};

Stats.prototype.get = function(key) {
  return this.vals[key] || 0;
};

Stats.prototype.maybeZero = function(key) {
  this.vals[key] = this.vals[key] || 0;
};
