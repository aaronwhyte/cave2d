/**
 * Control trackball base class
 * @constructor
 */
function Trackball() {
  this.val = new Vec2d();
  this.friction = 0.05;
  this.touched = false;
}

Trackball.CONTRIB_KEY = 1;
Trackball.CONTRIB_TOUCH = 2;
Trackball.CONTRIB_MOUSE = 4;

Trackball.prototype.setFriction = function(f) {
  this.friction = f;
  return this;
};

/**
 * @param {Vec2d} out
 * @return {Vec2d} out
 */
Trackball.prototype.getVal = function(out) {
  return out.set(this.val);
};

/**
 * Returns a bitfield of trackballs that have been interacted with since
 * @returns {number}
 */
Trackball.prototype.getContrib = function() {
  return 0;
};

/**
 * Resets the delta between the old position and the new. Use in the event loop
 * after everyone's had a chance to read the trackball val, to prepare
 * to accumulate delta events before the next iteration.
 */
Trackball.prototype.reset = function() {console.log("reset unimplimented")};

Trackball.prototype.isTouched = function() {
  return this.touched;
};

Trackball.prototype.startListening = function() {console.log("startListening unimplimented")};
Trackball.prototype.stopListening = function() {console.log("stopListening unimplimented")};
