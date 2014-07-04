/**
 * A node which scales its children over time.
 * @constructor
 * @extends {BaseNode}
 */
function ScaleNode() {
  BaseNode.call(this);
}
ScaleNode.prototype = new BaseNode();
ScaleNode.prototype.constructor = ScaleNode;


ScaleNode.prototype.addValue = function(time, scale) {
  this.addValueObject({
    'time': time,
    'scale': scale
  });
};

ScaleNode.prototype.render = function(context, time) {
  context.save();
  var inter = this.calcInterpolation(time);
  if (inter) {
    var s = inter[0].scale + inter[2] * (inter[1].scale - inter[0].scale);
    context.scale(s, s);
  }
  this.renderChildren(context, time);
  context.restore();
};
