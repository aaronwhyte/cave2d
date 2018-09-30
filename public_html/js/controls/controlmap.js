/**
 * A map from name to control that can start and stop listening and draw all drawable ones.
 * @constructor
 */
function ControlMap(opt_useEventQueue) {
  this.map = new Map();

  this.useEventQueue = opt_useEventQueue || false;
  if (this.useEventQueue) {
    this.queue = [];
    this.queueSize = 0;
    this.nextReadIndex = 0;
  }
}

ControlMap.USE_EVENT_QUEUE = true;

/**
 * @param {String} controlName
 * @param control
 * @returns {ControlMap} this
 */
ControlMap.prototype.addControl = function(controlName, control) {
  this.map.set(controlName, control);
  if (this.useEventQueue && control.registerEventQueue) {
    control.registerEventQueue(this, controlName);
  }
  return this;
};

/**
 * @param {string} controlName
 * @param {ControlEvent.Type} eventType
 * @returns {ControlEvent} the event, so the caller can set the appropriate field values
 */
ControlMap.prototype.enqueueEvent = function(controlName, eventType) {
  // console.log('enqueueEvent', controlName, eventType, this.queueSize +1);
  this.queueSize++;
  if (this.queue.length < this.queueSize) {
    this.queue.push(new ControlEvent());
  }
  let e = this.queue[this.queueSize - 1];
  e.setNameAndType(controlName, eventType);
  return e;
};

/**
 * Give controls that have per-frame polling a chance to append events.
 * Called before consuming the event queue.
 */
ControlMap.prototype.pollControls = function() {
  for (let c of this.map.values()) {
    if (c.poll) c.poll();
  }
};

/**
 * Virtually clear the event queue by setting the length to 0.
 * Called after consuming the event queue.
 */
ControlMap.prototype.clearEventQueue = function() {
  this.queueSize = 0;
  this.nextReadIndex = 0;
};

/**
 * Returns the next event in the queue, or null if there isn't one.
 * Use like "while (e = controlMap.nextEvent()) { ...process e... }"
 */
ControlMap.prototype.nextEvent = function() {
  return this.queueSize <= this.nextReadIndex
      ? null
      : this.queue[this.nextReadIndex++];
};

/**
 * @param {String} name
 * @returns {*} control
 */
ControlMap.prototype.getControl = function(name) {
  return this.map.get(name);
};

ControlMap.prototype.startListening = function() {
  for (let c of this.map.values()) {
    c.startListening();
  }
  return this;
};

ControlMap.prototype.stopListening = function() {
  for (let c of this.map.values()) {
    c.stopListening();
  }
  return this;
};

ControlMap.prototype.draw = function(renderer) {
  for (let c of this.map.values()) {
    if (c.draw) {
      c.draw(renderer);
    }
  }
  return this;
};

ControlMap.prototype.releaseControls = function() {
  for (let c of this.map.values()) {
    if (c.release) {
      c.release();
    }
  }
  return this;
};

ControlMap.prototype.setPointerLockAllowed = function(allowed) {
  for (let c of this.map.values()) {
    if (c.setPointerLockAllowed) {
      c.setPointerLockAllowed(allowed);
    }
  }
  return this;
};