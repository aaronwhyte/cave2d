/**
 * @constructor
 */
function LabelMaker(glyphs) {
  this.glyphs = glyphs;
}

LabelMaker.prototype.createLabelModel = function(startMatrix, nextCharMatrix, text) {
  this.glyphs.initModels();
  var labelModel = new RigidModel();
  var mutableGlyph = new RigidModel();
  var matrix = new Matrix44();
  matrix.set(startMatrix);
  for (var i = 0; i < text.length; i++) {
    var originalGlyph = this.glyphs.models[text.charAt(i)];
    if (originalGlyph) {
      mutableGlyph.clear().addRigidModel(originalGlyph);
      mutableGlyph.transformPositions(matrix);
      labelModel.addRigidModel(mutableGlyph);
    }
    matrix.multiply(nextCharMatrix);
  }
  return labelModel;
};
