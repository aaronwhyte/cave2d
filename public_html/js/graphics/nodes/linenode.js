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
  var pair = this.calcInterpolationPair(time);
  if (!pair) return;
  var fraction;
  if (pair[0].time == pair[1].time) {
    fraction = 0.5;
  } else {
    fraction = (time - pair[0].time) / (pair[1].time - pair[0].time);
  }
  this.interPointA.set(pair[0].pointA).slideByFraction(pair[1].pointA, fraction);
  this.interPointB.set(pair[0].pointB).slideByFraction(pair[1].pointB, fraction);
  context.beginPath();
  context.moveTo(this.interPointA.x, this.interPointA.y);
  context.lineTo(this.interPointB.x, this.interPointB.y);
  context.stroke();
};