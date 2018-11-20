/**
 * Base class for key/value storage, like LocalStorage or a JSON object.
 * @constructor
 */
function StorageLike() {
}

/**
 * @return {Array.<String>} all the keys as Strings
 */
StorageLike.prototype.keys = function() {
  throw "unimplemented";
};

/**
 * @param {String} key
 * @return {String} value or null
 */
StorageLike.prototype.get = function(key) {
  throw "unimplemented";
};

/**
 * @param {String} key
 * @param {*} val  Any String value will be taken as-is, but non-String values will be cast to String.
 *                 That means an object will become "[Object object]" or something, so serialize before calling set.
 *                 This is the behavior of LocalStorage.
 */
StorageLike.prototype.set = function(key, val) {
  throw "unimplemented";
};

/**
 * @param {String} key
 */
StorageLike.prototype.remove = function(key) {
  throw "unimplemented";
};

StorageLike.prototype.clear = function() {
  throw "unimplemented";
};
