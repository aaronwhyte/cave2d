/**
 * @param {Storage} storage like LocalStorage or SessionStorage
 * @constructor
 * @extends StorageLike
 */
function RealStorage(storage) {
  this.s = storage;
}

/**
 * @return {Array.<String>} all the keys as Strings
 */
RealStorage.prototype.keys = function() {
  var k = [];
  for (var i = 0; i < this.s.length; i++) {
    k.push(this.s.key(i));
  }
  return k;
};

/**
 * @param {String} key
 * @return {String} value or null
 */
RealStorage.prototype.get = function(key) {
  return this.s.getItem(key);
};

/**
 * @param {String} key
 * @param {String} val
 */
RealStorage.prototype.set = function(key, val) {
  this.s.setItem(key, val);
};

/**
 * @param {String} key
 */
RealStorage.prototype.remove = function(key) {
  this.s.removeItem(key);
};

RealStorage.prototype.clear = function() {
  this.s.clear();
};
