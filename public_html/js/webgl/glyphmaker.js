/**
 * Helps build glyph (printable character) RigidModel objects.
 * @param lineWidth
 * @param glyphDepth
 * @constructor
 */
function GlyphMaker(lineWidth, glyphDepth) {
  this.lineWidth = lineWidth;
  this.glyphDepth = glyphDepth;

  this.rigidModel = new RigidModel();
  this.mat = new Matrix44();
  this.vec = new Vec4();
}

GlyphMaker.prototype.clear = function() {
  this.rigidModel.clear();
};

GlyphMaker.prototype.addStick = function(x0, y0, x1, y1) {
  var len = Vec2d.distance(x0, y0, x1, y1) + this.lineWidth;
  var fat = this.lineWidth/2;
  var cuboid = RigidModel.createCube();

  // scale to the final size
  cuboid.transformPositions(this.mat.toScaleOp(this.vec.setXYZ(len/2, fat, this.glyphDepth/2)));

  // translate so x0, y0 is at the origin
  cuboid.transformPositions(this.mat.toTranslateOp(this.vec.setXYZ(len/2 - fat, 0, 0)));

  // rotate to final angle
  cuboid.transformPositions(this.mat.toRotateZOp(Math.atan2(y1 - y0, x1 - x0)));

  // move to final position
  cuboid.transformPositions(this.mat.toTranslateOp(this.vec.setXYZ(x0, y0, 0)));

  this.rigidModel.addRigidModel(cuboid);
};

GlyphMaker.prototype.addToRigidModel = function(target) {
  target.addRigidModel(this.rigidModel);
  return target;
};
