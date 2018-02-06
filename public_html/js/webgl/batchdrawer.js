/**
 * A tool for drawing one RigidModel, that batches up multiple draw calls in JS, in order
 * to minimize the number of actual GL calls, which helps performance on older mobile hardware.
 * @param {Array.<ModelStamp>} stamps An array of stamps, for N different instance counts.<br>
 * stamps[0] has one instance, stamps[1] has 2 instances, etc.
 * @param {Renderer} renderer
 * @constructor
 */
function BatchDrawer(stamps, renderer) {
  this.stamps = stamps;
  this.renderer = renderer;
  this.maxCount = stamps.length;

  this.c = [];
  this.m = [];
  this.m2 = [];
  this.instances = 0;
}

/**
 * @param {Vec4} color
 * @param {Matrix44} matrix
 * @param {Matrix44=} matrix2 If not provided, then an identity matrix will be used
 */
BatchDrawer.prototype.batchDraw = function(color, matrix, matrix2) {
  this.copyData(color.v, this.c);
  this.copyData(matrix.m, this.m);
  this.copyData((matrix2 ? matrix2.m : Matrix44.IDENTITY_ARRAY), this.m2);
  this.instances++;

  if (this.instances === this.maxCount) {
    this.flush();
  }
};

BatchDrawer.prototype.flush = function() {
  if (this.instances === 0) return;
  this.renderer.setBatchUniforms(this.c, this.m, this.m2);
  this.renderer.setStamp(this.stamps[this.instances - 1]);
  this.renderer.drawStamp();
  this.instances = 0;
};

BatchDrawer.prototype.copyData = function(src, dest) {
  let len = src.length;
  let start = len * this.instances;
  for (let i = 0; i < len; i++) {
    dest[start + i] = src[i];
  }
};

