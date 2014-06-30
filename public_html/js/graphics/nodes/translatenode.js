/**
 * A node which translates its children over time.
 * @constructor
 * @extends {BaseNode}
 */
function TranslateNode() {
  BaseNode.call(this);
  this.translate = new Vec2d();
}
TranslateNode.prototype = new BaseNode();
TranslateNode.prototype.constructor = TranslateNode;


TranslateNode.prototype.addValue = function(time, translate) {
  this.addValueObject({
    'time': time,
    'translate': translate
  });
};

TranslateNode.prototype.render = function(context, time) {
  context.save();
  var inter = this.calcInterpolation(time);
  if (inter) {
    this.translate.set(inter[0].translate).slideByFraction(inter[1].translate, inter[2]);
    context.translate(this.translate.x, this.translate.y);
  }
  this.renderChildren(context, time);
  context.restore();
};
