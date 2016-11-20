/**
 * A circular buffer of values and sample times from a single Stats key
 * @param {Stats} stats
 * @param {String} statName
 * @param {Number} length
 * @constructor
 */
function StatTrail(stats, statName, length) {
  this.stats = stats;
  this.statName = statName;
  this.maxLength = length;
  this.vals = new CircularQueue(length);
  this.times = new CircularQueue(length);
}

StatTrail.prototype.sample = function(now) {
  this.vals.enqueue(this.stats.get(this.statName));
  this.times.enqueue(now);
};

StatTrail.prototype.size = function() {
  return this.vals.size();
};

StatTrail.prototype.getVal = function(i) {
  if (i >= this.size()) return 0;
  return this.vals.getFromHead(i);
};

StatTrail.prototype.getTime = function(i) {
  return this.times.getFromHead(i);
};
