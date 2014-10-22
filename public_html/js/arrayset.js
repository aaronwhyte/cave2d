/**
 * A small set, implemented with an array.
 * It has O(n) put, remove, and contains, but it has fast iteration.
 * Good for small sets that will get iterated over a lot.
 * Chrome can optimize this, because there are no for-each loops over arbitrary keys.
 * @constructor
 */
function ArraySet() {
  this.vals = [];
}

ArraySet.prototype.reset = function() {
  this.vals.length = 0;
  return this;
};

Poolify(ArraySet);

ArraySet.prototype.put = function(v) {
  for (var i = 0; i < this.vals.length; i++) {
    if (this.vals[i] === v) {
      return;
    }
  }
  this.vals.push(v);
  return this;
};

ArraySet.prototype.contains = function(v) {
  for (var i = 0; i < this.vals.length; i++) {
    if (this.vals[i] === v) {
      return true;
    }
  }
  return false;
};

ArraySet.prototype.remove = function(v) {
  for (var i = 0; i < this.vals.length; i++) {
    if (this.vals[i] === v) {
      this.vals[i] = this.vals[this.vals.length - 1];
      this.vals.pop();
    }
  }
  return this;
};

ArraySet.prototype.removeIndex = function(index) {
  this.vals[index] = this.vals[this.vals.length - 1];
  this.vals.pop();
  return this;
};

ArraySet.prototype.isEmpty = function() {
  return this.vals.length == 0;
};
