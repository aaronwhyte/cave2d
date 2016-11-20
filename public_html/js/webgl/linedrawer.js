/**
 * Simple utility for helping a renderer draw lines. For setting color and view matrixes, use
 * the underlying renderer. This expects the caller to set color and view matrix, then moveTo and lineTo.
 * @param {Renderer} renderer
 * @param {ModelStamp} stamp probably always a medium-rez cylinder, until I support proper rotation
 * @constructor
 */
function LineDrawer(renderer, stamp) {
  this.renderer = renderer;
  this.nextGroup = 0; // legal values are 1 and 2
  this.stamp = stamp;

  this.m = new Matrix44();

  this.nextZ = -0.99;
  this.nextLineThickness = 2;
}

LineDrawer.prototype.moveToXY = function(x, y) {
  this.nextGroup = 1;
  this.setRendererMatrix(x, y);
  this.renderer.setStamp(this.stamp);
  return this;
};

LineDrawer.prototype.lineToXY = function(x, y) {
  if (!this.nextGroup) {
    throw "you gotta moveTo before you lineTo";
  }
  this.nextGroup = (this.nextGroup == 1) ? 2 : 1;
  this.setRendererMatrix(x, y);
  this.renderer.drawStamp();
  return this;
};

LineDrawer.prototype.drawRect = function(rect, z, r) {
  var n = rect.getMinY();
  var s = rect.getMaxY();
  var w = rect.getMinX();
  var e = rect.getMaxX();
  this.moveToXY(w, n).lineToXY(e, n).lineToXY(e, s).lineToXY(w, s).lineToXY(w, n);
  return this;
};

LineDrawer.prototype.setRendererMatrix = function (x, y) {
  var z = this.nextZ;
  var r = this.nextLineThickness * 0.5;
  this.m.toTranslateXYZAndScaleXYZOp(x, y, z, r, r, r);
  if (this.nextGroup == 1) {
    this.renderer.setModelMatrix(this.m);
  } else {
    this.renderer.setModelMatrix2(this.m);
  }
};
