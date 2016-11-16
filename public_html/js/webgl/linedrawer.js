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
}

LineDrawer.prototype.moveToXYZR = function (x, y, z, r) {
  this.nextGroup = 1;
  this.setRendererMatrix(x, y, z, r);
};

LineDrawer.prototype.lineToXYZR = function (x, y, z, r) {
  if (!this.nextGroup) {
    throw "you gotta moveTo before you lineTo";
  }
  this.nextGroup = (this.nextGroup == 1) ? 2 : 1;
  this.setRendererMatrix(x, y, z, r);
  this.renderer.setStamp(this.stamp).drawStamp();
};

LineDrawer.prototype.setRendererMatrix = function (x, y, z, r) {
  this.m.toTranslateXYZAndScaleXYZOp(x, y, z, r, r, 1);
  if (this.nextGroup == 1) {
    this.renderer.setModelMatrix(this.m);
  } else {
    this.renderer.setModelMatrix2(this.m);
  }
};
