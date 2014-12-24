/**
 * A node which rotates its children over time.
 * @constructor
 * @extends {BaseNode}
 */
function RotateNode() {
  BaseNode.call(this);
}
RotateNode.prototype = new BaseNode();
RotateNode.prototype.constructor = RotateNode;


RotateNode.prototype.addValue = function(time, rotate) {
  this.addValueObject({
    'time': time,
    'rotate': rotate
  });
};

RotateNode.prototype.render = function(context, time) {
  context.save();
  var inter = this.calcInterpolation(time);
  if (inter) {
    context.rotate(inter[0].rotate + inter[2] * (inter[1].rotate - inter[0].rotate));
  }
  this.renderChildren(context, time);
  context.restore();
};
