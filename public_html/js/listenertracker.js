/**
 * Tracks listeners so unlistening can be done easily.
 * @constructor
 */
ListenerTracker = function() {
  this.listeners = [];
};

ListenerTracker.prototype.addListener = function(element, eventName, fn) {
  Events.addListener(element, eventName, fn);
  this.listeners.push([element, eventName, fn]);
};

ListenerTracker.prototype.removeAllListeners = function() {
  var a;
  while (a = this.listeners.pop()) {
    Events.removeListener(a[0], a[1], a[2]);
  }
};
