/**
 * Listens for mouse and touch events on a canvas, and distributes them
 * to one layer of listeners at a time, in layer order.
 * If any listener in a layer reports that the event was handled, by returning "false",
 * then that event will not be distributed to the next layer.
 * @param canvas
 * @param layerCount
 * @constructor
 */
function LayeredEventDistributor(canvas, layerCount) {
  this.canvas = canvas;
  this.layerCount = layerCount;

  this.layers = [];
  for (var i = 0; i < layerCount; i++) {
    // Each layer is a map from event name to an ArraySet of listeners.
    this.layers[i] = this.createLayer(i);
  }

  this.listening = false;

  this.canvasListeners = {};
  for (var i = 0; i < LayeredEventDistributor.EVENT_NAMES.length; i++) {
    var name = LayeredEventDistributor.EVENT_NAMES[i];
    this.canvasListeners[name] = this.createListenerFn(name);
  }

  this.deferred = [];
}

LayeredEventDistributor.EVENT_NAMES = [
  'touchstart',
  'touchmove',
  'touchend',
  'touchcancel',
  'mousedown',
  'mousemove',
  'mouseup'
];

LayeredEventDistributor.prototype.startListening = function() {
  if (this.listening) return;
  for (var i = 0; i < LayeredEventDistributor.EVENT_NAMES.length; i++) {
    var name = LayeredEventDistributor.EVENT_NAMES[i];
    Events.addListener(this.canvas, name, this.canvasListeners[name]);
  }
  this.listening = true;
};

LayeredEventDistributor.prototype.stopListening = function() {
  if (!this.listening) return;
  for (var i = 0; i < LayeredEventDistributor.EVENT_NAMES.length; i++) {
    var name = LayeredEventDistributor.EVENT_NAMES[i];
    Events.removeListener(this.canvas, name, this.canvasListeners[name]);
  }
  this.listening = false;
};

LayeredEventDistributor.ADD_LISTENER = 1;
LayeredEventDistributor.REMOVE_LISTENER = 2;

LayeredEventDistributor.prototype.addEventListenerToLayer = function(eventName, listenerFn, layerNum) {
  if (this.nowHandlingEvents) {
    this.deferred.push([LayeredEventDistributor.ADD_LISTENER, eventName, listenerFn, layerNum]);
  } else {
    var layer = this.layers[layerNum];
    if (!layer[eventName]) {
      layer[eventName] = new Set();
    }
    layer[eventName].add(listenerFn);
  }
};

LayeredEventDistributor.prototype.removeEventListenerFromLayer = function(eventName, listenerFn, layerNum) {
  if (this.nowHandlingEvents) {
    this.deferred.push([LayeredEventDistributor.REMOVE_LISTENER, eventName, listenerFn, layerNum]);
  } else {
    var layer = this.layers[layerNum];
    if (layer[eventName]) {
      layer[eventName].delete(listenerFn);
    }
  }
};

LayeredEventDistributor.prototype.getFakeLayerElement = function(layerNum) {
  return this.layers[layerNum];
};

/**
 * Iterates through every layer, calling all the listeners
 * @param name
 * @param e
 */
LayeredEventDistributor.prototype.handleEvent = function(name, e) {
  let canvas = this.canvas;
  this.nowHandlingEvents = true;
  var stop = false;
  for (var layerNum = 0; !stop && layerNum < this.layerCount; layerNum++) {
    var layer = this.layers[layerNum];
    var listeners = layer[name];
    if (listeners) {
      listeners.forEach(function(fn) {
        // Call the function using the canvas element as the "this".
        var result = fn.call(canvas, e);
        if (result === false) {
          // The handler returned false, so don't distribute the event to any more layers
          // (but finish this layer).
          stop = true;
        }
      });
    }
  }
  this.nowHandlingEvents = false;
  // Some listeners were added or removed while handling listeners!
  // Those actions are deferred until nnnow.
  for (var i = 0; i < this.deferred.length; i++) {
    var d = this.deferred[i];
    if (d[0] === LayeredEventDistributor.ADD_LISTENER) {
      this.addEventListenerToLayer(d[1], d[2], d[3]);
    } else if (d[0] === LayeredEventDistributor.REMOVE_LISTENER) {
      this.removeEventListenerFromLayer(d[1], d[2], d[3]);
    }
  }
  this.deferred.length = 0;
};

LayeredEventDistributor.prototype.createLayer = function(num) {
  var layer = {};
  var self = this;
  layer.addEventListener = function(type, listener) {
    self.addEventListenerToLayer(type, listener, num);
  };
  layer.removeEventListener = function(type, listener) {
    self.removeEventListenerFromLayer(type, listener, num);
  };
  layer.requestPointerLock = function() {
    self.canvas.requestPointerLock();
  };
  return layer;
};

LayeredEventDistributor.prototype.createListenerFn = function(name) {
  var self = this;
  return function(e) {
    self.handleEvent(name, e);
  };
};
