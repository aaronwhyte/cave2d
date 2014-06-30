/**
 * A single line segment whose two endpoints change over time.
 * @constructor
 * @extends {BaseNode}
 */
function LineNode() {
  BaseNode.call(this);
  this.interPointA = new Vec2d();
  this.interPointB = new Vec2d();
}
LineNode.prototype = new BaseNode();
LineNode.prototype.constructor = LineNode;


LineNode.prototype.addValue = function(time, pointA, pointB) {
  this.addValueObject({
    'time': time,
    'pointA': pointA,
    'pointB': pointB
  });
};

LineNode.prototype.render = function(context, time) {
  var inter = this.calcInterpolation(time);
  if (!inter) return;
  this.interPointA.set(inter[0].pointA).slideByFraction(inter[1].pointA, inter[2]);
  this.interPointB.set(inter[0].pointB).slideByFraction(inter[1].pointB, inter[2]);
  context.beginPath();
  context.moveTo(this.interPointA.x, this.interPointA.y);
  context.lineTo(this.interPointB.x, this.interPointB.y);
  context.stroke();
  this.renderChildren(context, time);
};
