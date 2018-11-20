/**
 * @constructor
 * @extends StorageLike
 */
function JsonStorage() {
  this.s = {};
}

/**
 * @return {Array.<String>} all the keys as Strings
 */
JsonStorage.prototype.keys = function() {
  var k = [];
  for (var i in this.s) {
    k.push(i);
  }
  return k;
};

/**
 * @param {String} key
 * @return {String} value or null
 */
JsonStorage.prototype.get = function(key) {
  var val = this.s[key];
  return (typeof val === 'undefined') ? null : val;
};

/**
 * @param {String} key
 * @param {String} val
 */
JsonStorage.prototype.set = function(key, val) {
  this.s[key] = (typeof val === 'string') ? val : String(val);
};

/**
 * @param {String} key
 */
JsonStorage.prototype.remove = function(key) {
  delete this.s[key];
};

JsonStorage.prototype.clear = function() {
  var keys = this.keys();
  for (var i = 0; i < keys.length; i++) {
    this.remove(keys[i]);
  }
};
