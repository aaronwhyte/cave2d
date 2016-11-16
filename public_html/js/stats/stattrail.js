/**
 * A circular buffer of values and sample times from a single Stats key
 * @param {Stats} stats
 * @param {String} key
 * @param {Number} length
 * @constructor
 */
function StatTrail(stats, key, length) {
  this.maxLength = length;
  this.stats = stats;
  this.key = key;
  this.vals = new CircularQueue(length);
  this.times = new CircularQueue(length);
}

StatTrail.prototype.sample = function(now) {
  this.vals.enqueue(this.stats.get(this.key));
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
