/**
 * A map from name to control that can start and stop listening and draw all drawable ones.
 * @constructor
 */
function ControlMap() {
  this.map = {};
}

ControlMap.prototype.add = function(name, control) {
  this.map[name] = control;
  return this;
};

ControlMap.prototype.get = function(name) {
  return this.map[name];
};

ControlMap.prototype.startListening = function() {
  for (let i in this.map) {
    this.map[i].startListening();
  }
  return this;
};

ControlMap.prototype.stopListening = function() {
  for (let i in this.map) {
    this.map[i].stopListening();
  }
  return this;
};

ControlMap.prototype.draw = function(renderer) {
  for (let i in this.map) {
    let control = this.map[i];
    if (control.draw) {
      control.draw(renderer);
    }
  }
  return this;
};

ControlMap.prototype.releaseControls = function() {
  for (let i in this.map) {
    let control = this.map[i];
    if (control.release) {
      control.release();
    }
  }
  return this;
};

ControlMap.prototype.setPointerLockAllowed = function(allowed) {
  for (let i in this.map) {
    let control = this.map[i];
    if (control.setPointerLockAllowed) {
      control.setPointerLockAllowed(allowed);
    }
  }
  return this;
};