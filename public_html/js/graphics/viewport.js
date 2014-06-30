/**
 * This will transform from default canvas coords to viewport coords, where the
 * origin is at the center of the canvas, with the positive Y axis pointing up,
 * and the positive X axis pointing right.
 * A unit circle will just barely fit
 * @param {HTMLCanvasElement} canvas
 * @constructor
 */
function Viewport(canvas) {
  this.canvas = canvas;
}

/**
 * Translates and scales the context from the default canvas coords to viewport coords,
 * based on the canvas's current height and width.
 */
Viewport.prototype.transform = function(ctx) {
  var halfWidth = this.canvas.width / 2;
  var halfHeight = this.canvas.height / 2;
  var minHalf = Math.min(halfWidth, halfHeight);
  ctx.translate(halfWidth, halfHeight);
  ctx.scale(minHalf, -minHalf);
};