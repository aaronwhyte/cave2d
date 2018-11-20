/**
 * Allows a publisher to call multiple subscriber functions at once.
 * Subscribers can add and remove themselves.
 * @constructor
 */
PubSub = function() {
  this.subs = new Set();
};

/**
 * Adds a subscriber function.
 * @param {Object} func
 */
PubSub.prototype.subscribe = function(func) {
  this.subs.add(func);
};

/**
 * Deletes a subscriber function.
 * @param {Object} func
 */
PubSub.prototype.unsubscribe = function(func) {
  this.subs.delete(func);
};

/**
 * Calls all the subscribers in the order in which they were added,
 * passing all arguments along.  Calls the functions in the global context.
 */
PubSub.prototype.publish = function(/* whatever */) {
  this.subs.forEach((v) => {
    v.apply(null, arguments)
  });
};

/**
 * Clears the subscriber list.
 */
PubSub.prototype.clear = function () {
  this.subs.clear();
};
