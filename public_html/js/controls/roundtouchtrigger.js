/**
 * A round control Trigger using a touchscreen.
 * Use setCanvas() and setXYR() to set it up, then just read its value.
 *
 * @deprecated Use TriggerWidget instead
 * 
 * @constructor
 * @extends {TouchTrigger}
 */
function RoundTouchTrigger(canvas) {
  TouchTrigger.call(this, canvas);

  this.px = 0.5;
  this.py = 0.5;
  this.rx = 0.05;
  this.ry = 0.05;
  this.canvas = canvas;

  var self = this;
  this.setStartZoneFunction(function(x, y) {
    if (self.canvas == null) return false;
    return Vec2d.distance(x, y, self.getX(), self.getY()) <= self.getRad();
  });
}

RoundTouchTrigger.prototype = new TouchTrigger();
RoundTouchTrigger.prototype.constructor = RoundTouchTrigger;

/**
 * @param xFraction a fraction (0-1) of the canvas width
 * @param yFraction  a fraction (0-1) of the canvas height
 */
RoundTouchTrigger.prototype.setPosFractionXY = function(xFraction, yFraction) {
  this.px = xFraction;
  this.py = yFraction;
  return this;
};

/**
 * The radius of the button is the xFraction * canvas.width + yFraction * canvas.height
 * @param xFraction a fraction (0-1) of the canvas width
 * @param yFraction a fraction (0-1) of the canvas height
 */
RoundTouchTrigger.prototype.setRadCoefsXY = function(xFraction, yFraction) {
  this.rx = xFraction;
  this.ry = yFraction;
  return this;
};

RoundTouchTrigger.prototype.getX = function() {
  return this.px * this.canvas.width;
};

RoundTouchTrigger.prototype.getY = function() {
  return this.py * this.canvas.height;
};

RoundTouchTrigger.prototype.getRad = function() {
  return this.rx * this.canvas.width + this.ry * this.canvas.height;
};