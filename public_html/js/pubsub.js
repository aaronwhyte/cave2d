/**
 * Allows a publisher to call multiple subscriber functions at once.
 * Subscribers can add and remove themselves.
 * @constructor
 */
PubSub = function() {
  this.subs = new ArraySet();
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
  this.subs.remove(func);
};

/**
 * Calls all the subscribers in the order in which they were added,
 * passing all arguments along.  Calls the functions in the global context.
 */
PubSub.prototype.publish = function(/* whatever */) {
  for (var i = 0, n = this.subs.vals.length; i < n; ++i) {
    this.subs.vals[i].apply(null, arguments);
  }
};

/**
 * Clears the subscriber list.
 */
PubSub.prototype.clear = function () {
  this.subs.clear();
};
