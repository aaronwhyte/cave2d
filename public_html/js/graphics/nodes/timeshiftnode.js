/**
 * A node which timeshifts its children over time.
 * It can use used to make time jump to a certain point,
 * go fast, stand still, reverse, wiggle back and forth, etc.
 * @constructor
 * @extends {BaseNode}
 */
function TimeShiftNode() {
  BaseNode.call(this);
}
TimeShiftNode.prototype = new BaseNode();
TimeShiftNode.prototype.constructor = TimeShiftNode;


TimeShiftNode.prototype.addValue = function(time, shift) {
  this.addValueObject({
    'time': time,
    'shift': shift
  });
};

TimeShiftNode.prototype.render = function(context, time) {
  var inter = this.calcInterpolation(time);
  var shift = 0;
  if (inter) {
    shift = inter[0].shift + inter[2] * (inter[1].shift - inter[0].shift);
  }
  this.renderChildren(context, time + shift);
};
