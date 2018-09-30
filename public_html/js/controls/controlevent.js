/**
 * Items in a ControlMap's queue.
 * @constructor
 */
function ControlEvent() {
  this.controlName = null;
  this.eventType = null;
  this.vec = new Vec2d();
  this.bool = false;
}

/**
 * @enum {number}
 */
ControlEvent.Type = {
  PRESS: 1,
  VEC: 2
};

/**
 * @param {string} controlName
 * @param {number} eventType
 * @returns {ControlEvent}
 */
ControlEvent.prototype.setNameAndType = function(controlName, eventType) {
  this.controlName = controlName;
  this.eventType = eventType;
  return this;
};

/**
 * @param {boolean} b
 * @returns {ControlEvent}
 */
ControlEvent.prototype.setBool = function(b) {
  this.bool = b;
  return this;
};

/**
 * @param {Vec2d} v
 * @returns {ControlEvent}
 */
ControlEvent.prototype.setVec = function(v) {
  this.vec.set(v);
  return this;
};
