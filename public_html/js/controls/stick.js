/**
 * Control stick base class
 * @constructor
 */
function Stick() {
  this.val = new Vec2d();
}

/**
 * @param {Vec2d} out
 * @return {Vec2d} out
 */
Stick.prototype.getVal = function(out) {
  return out.set(this.val);
};

/**
 * If the stick value is greater than one, scale it down to one.
 * @return {Vec2d}
 */
Stick.prototype.clip = function() {
  return this.val.clipToMaxLength(1);
};
