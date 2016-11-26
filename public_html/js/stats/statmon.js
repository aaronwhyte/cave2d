/**
 * Combines a StatTrail and a StatGraph, for easy encapsulation
 * @param {Stats} stats where the stat to sample lives
 * @param {string} statName the one to sample
 * @param {number} sampleInterval only sample every N calls to sample(). 1 means sample every time
 * @param {number} sampleCount the nubmer of samples the trail will remember. They are drawn evenly spaces, meh
 * @param {number} minVal expected lowest value
 * @param {number} maxVal expected highest value
 * @param {Renderer} renderer
 * @param {LineDrawer} lineDrawer
 * @param {Cuboid} cuboid
 * @constructor
 */
function StatMon(stats, statName,
                 sampleInterval, sampleCount,
                 minVal, maxVal,
                 renderer, lineDrawer, cuboid) {
  this.stats = stats;
  this.statName = statName;
  this.sampleInterval = sampleInterval;
  this.sampleCount = sampleCount;
  this.minVal = minVal;
  this.maxVal = maxVal;
  this.renderer = renderer;
  this.lineDrawer = lineDrawer;

  this.z = 0;
  this.graphColor = new Vec4(0.5, 1, 0.5);
  this.borderColor = new Vec4(0.3, 0.6, 0.3);
  this.viewMatrix = new Matrix44();
  this.mat44 = new Matrix44();
  this.lineWidth = 3;
  this.borderWidth = 2;

  // TODO: also support non-rate trails? Hm.
  this.trail = new StatRateTrail(stats, this.statName, this.sampleCount);
  this.graph = new StatGraph(this.trail, this.lineDrawer);
  this.graph.setTimespan(this.sampleCount * this.sampleInterval - 1);
  this.graph.setValueRange(minVal, maxVal);
  this.graph.setCuboid(cuboid);

  this.sampleCalls = 0;
  this.sampleNum = -1;
  this.canvasWidth = 0;
  this.canvasHeight = 0;
}

StatMon.prototype.setBorderWidth = function(w) {
  this.borderWidth = w;
  return this;
};

StatMon.prototype.setBorderColor = function(v) {
  this.borderColor.set(v);
  return this;
};

StatMon.prototype.setLineWidth = function(w) {
  this.lineWidth = w;
  return this;
};

StatMon.prototype.setGraphColor = function(v) {
  this.graphColor.set(v);
  return this;
};

StatMon.prototype.sample = function() {
  this.sampleCalls++;
  if (this.sampleCalls % this.sampleInterval == 0) {
    this.sampleNum++;
    // really sample
    this.trail.sample(this.sampleCalls);
  }
};

StatMon.prototype.draw = function(width, height) {
  if (width != this.canvasWidth || height != this.canvasHeight) {
    // recalculate viewMatrix
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.viewMatrix.toIdentity();
    this.viewMatrix
        .multiply(this.mat44.toTranslateOpXYZ(-1, 1, 0))
        .multiply(this.mat44.toScaleOpXYZ(2 / width, -2 / height, -1));
  }
  this.renderer.setViewMatrix(this.viewMatrix)

  // border
  if (this.borderWidth) {
    this.renderer.setColorVector(this.borderColor);
    this.lineDrawer.nextLineThickness = this.borderWidth;
    this.lineDrawer.drawRectFromCuboid(this.graph.cuboid);
  }

  // data
  this.renderer.setColorVector(this.graphColor);
  this.graph.lineWidth = this.lineWidth;
  this.graph.draw(this.sampleCalls);
};
