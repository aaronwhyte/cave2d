/**
 * A control stick that adds other sticks together, clipping the result.
 * @constructor
 * @extends {Stick}
 */
function MultiStick() {
  Stick.call(this);
  this.sticks = [];
  this.temp = new Vec2d();
}
MultiStick.prototype = new Stick();
MultiStick.prototype.constructor = MultiStick;

MultiStick.prototype.addStick = function(s) {
  this.sticks.push(s);
  return this;
};

MultiStick.prototype.getVal = function(out) {
  this.val.reset();
  for (var i = 0; i < this.sticks.length; i++) {
    this.sticks[i].getVal(this.temp);
    this.val.add(this.temp);
  }
  this.clip();
  return out.set(this.val);
};
