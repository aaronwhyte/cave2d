/**
 * A rule for positioning and sizing a target cuboid based on a source cuboid and some rule state.
 * @param {Cuboid} source
 * @param {Cuboid} target
 * @constructor
 */
function CuboidRule(source, target) {
  this.source = source;
  this.target = target;

  this.maxParentRads = new Vec4();
  this.maxPixels = new Vec4();

  this.aspectRatio = new Vec4();

  this.sourceAnchorRads = new Vec4();
  this.sourceAnchorPixels = new Vec4();

  this.targetAnchorPixels = new Vec4();
  this.targetAnchorRads = new Vec4();

  this.sourceAnchor = new Vec4();
  this.targetAnchor = new Vec4();
}

/**
 * Sets rules for setting the size of the target based on the parent size and a constant max pixel size.
 * Zero in a dimension means unconstrained.
 * @param {Vec4} maxParentRads
 * @param {Vec4} maxPixels
 * @return {CuboidRule} this
 */
CuboidRule.prototype.setSizingMax = function(maxParentRads, maxPixels) {
  this.maxParentRads.set(maxParentRads);
  this.maxPixels.set(maxPixels);
  return this;
};

/**
 * Forces the aspect ratio between two or more dimensions (usually just X and Y).
 * A zero means that dimension is unconstrained.
 * @param {Vec4} ratio
 * @return {CuboidRule} this
 */
CuboidRule.prototype.setAspectRatio = function(ratio) {
  this.aspectRatio = ratio;
  return this;
};

/**
 * Defines position on the source that will be pinned to the other anchor on the target cuboid.
 * @param rads
 * @param pixels
 * @returns {CuboidRule} this
 */
CuboidRule.prototype.setSourceAnchor = function(rads, pixels) {
  this.sourceAnchorRads.set(rads);
  this.sourceAnchorPixels.set(pixels);
  return this;
};

/**
 * Defines position on the target that will be pinned to the other anchor on the source cuboid.
 * @param rads
 * @param pixels
 * @returns {CuboidRule} this
 */
CuboidRule.prototype.setTargetAnchor = function(rads, pixels) {
  this.targetAnchorRads.set(rads);
  this.targetAnchorPixels.set(pixels);
  return this;
};

CuboidRule.prototype.apply = function() {
  var s = this.source;
  var t = this.target;

  // SIZE
  // 1. calc target dimensions regardless of aspect ratios
  var lowestAspect = 0;
  for (var i = 0; i < 3; i++) {
    var maxParentRads = this.maxParentRads.getIndex(i);
    var maxPixels = this.maxPixels.getIndex(i);
    var rad = Math.min(maxParentRads * s.rad.getIndex(i), maxPixels);
    t.rad.setIndex(i, rad);
    // Find the most restricted dimension for aspect-ratio-based shrinking
    var dimAspectRatio = this.aspectRatio.getIndex(i);
    if (dimAspectRatio) {
      var aspect = rad / dimAspectRatio;
      if (!lowestAspect || aspect < lowestAspect) {
        lowestAspect = aspect;
      }
    }
  }
  // 2. optionally apply aspect ratio
  if (lowestAspect) {
    // apply aspect ratio to specified dimensions
    for (var i = 0; i < 3; i++) {
      dimAspectRatio = this.aspectRatio.getIndex(i);
      if (dimAspectRatio) {
        // This dimension is affected by aspect ratio.
        // In theory this can never increase the length of a dimension.
        t.rad.setIndex(i, dimAspectRatio * lowestAspect);
      }
    }
  }

  // POSITION
  this.sourceAnchor
      .set(this.source.rad)
      .scaleVec4(this.sourceAnchorRads)
      .add(this.sourceAnchorPixels)
      .add(this.source.pos);
  this.targetAnchor
      .set(this.target.rad)
      .scaleVec4(this.targetAnchorRads)
      .add(this.targetAnchorPixels)
      .add(this.target.pos);
  this.target.pos.subtract(this.targetAnchor).add(this.sourceAnchor);
};
