/**
 * A small set, implemented with an object.
 * Has the same interface as ArraySet, for easy swapping out.
 * @constructor
 */
function ObjSet() {
  this.vals = {};
}

ObjSet.prototype.reset = function() {
  for (var key in this.vals) {
    delete this.vals[key];
  }
  return this;
};

Poolify(ObjSet);

ObjSet.prototype.add = function(v) {
  this.vals[v] = true;
  return this;
};

ObjSet.prototype.contains = function(v) {
  return !!this.vals[v];
};

ObjSet.prototype.remove = function(v) {
  delete this.vals[v];
  return this;
};

ObjSet.prototype.clear = function(v) {
  return this.reset();
};


ObjSet.prototype.isEmpty = function() {
  for (var key in this.vals) {
    return false;
  }
  return true;
};

ObjSet.prototype.getValues = function() {
  var retval = {};
  for (var key in this.vals) {
    retval[key] = this.vals[key];
  }
  return retval;
};

ObjSet.prototype.size = function() {
  var n = 0;
  for (var key in this.vals) {
    n++;
  }
  return n;
};
