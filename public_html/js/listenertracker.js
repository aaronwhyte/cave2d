/**
 * Tracks listeners so unlistening can be done easily.
 * @constructor
 */
ListenerTracker = function() {
  this.listeners = [];
};

ListenerTracker.prototype.addListener = function(element, eventName, fn) {
  element.addEventListener(eventName, fn);
  this.listeners.push([element, eventName, fn]);
};

ListenerTracker.prototype.removeAllListeners = function() {
  var a;
  while (a = this.listeners.pop()) {
    a[0].removeEventListener(a[1], a[2]);
  }
};
