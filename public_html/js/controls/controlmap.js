/**
 * A map from name to control that can start and stop listening and draw all drawable ones.
 * @constructor
 */
function ControlMap() {
  this.map = new Map();
}

/**
 * @param {String} name
 * @param control
 * @returns {ControlMap} this
 */
ControlMap.prototype.addControl = function(name, control) {
  this.map.set(name, control);
  return this;
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