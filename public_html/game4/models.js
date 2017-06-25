/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models(glyphs) {
  this.glyphs = glyphs;
}

Models.prototype.getJoinButton = function() {
  return this.getCharButton('?');
};

Models.prototype.getButton1 = function() {
  return this.getCharButton('1');
};

Models.prototype.getButton2 = function() {
  return this.getCharButton('2');
};

Models.prototype.getMenuButton = function() {
  return this.getCharButton('!');
};

Models.prototype.getTest = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(-Math.PI/2));
};

Models.prototype.getUntest = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(Math.PI/2));
};

Models.prototype.getCharButton = function(char) {
  var m = new RigidModel();
  var glyphSize = 0.25;
  m.addRigidModel(this.glyphs.models[char]).transformPositions(new Matrix44().toScaleOpXYZ(glyphSize, -glyphSize, 1));
  m.addRigidModel(RigidModel.createCircle(24));
  return m;
};

