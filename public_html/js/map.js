/**
 * Map class, with arbitrary keys that won't collide with any system stuff.
 * @constructor
 */
Map = function() {
  this.m = {};
  this.length = 0;
};

Map.PREFIX = '=';

Map.prototype.set = function(k, v) {
  var objKey = Map.PREFIX + k;
  if (!this.m[objKey]) this.length++;
  this.m[objKey] = v;
  return this;
};

Map.prototype.get = function(k) {
  return this.m[Map.PREFIX + k];
};

Map.prototype.contains = function(k) {
  return this.get(k) !== undefined;
};

Map.prototype.remove = function(k) {
  var objKey = Map.PREFIX + k;
  if (this.m[objKey]) this.length--;
  delete this.m[objKey];
};

/**
 * @return {Array}
 */
Map.prototype.getKeys = function() {
  var keys = [];
  for (var pk in this.m) {
    keys.push(pk.substr(1));
  }
  return keys;
};
