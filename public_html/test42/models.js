/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models(glyphs) {
  this.glyphs = glyphs;
}

Models.prototype.getPause = function() {
  var m = new RigidModel();
  for (var x = -1; x <= 1; x += 2) {
    var bar = RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1)
                .multiply(new Matrix44().toTranslateOpXYZ(x * 3.25, 0, 0.9)
                )));
    m.addRigidModel(bar);
  }
  return m;
};

Models.prototype.getPlayerPause = function() {
  var m = new RigidModel();
  for (var x = -1; x <= 1; x += 2) {
    var bar = RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.2, 0.5, 1)
                .multiply(new Matrix44().toTranslateOpXYZ(x * 1.5, 0, 0.9)
                )));
    m.addRigidModel(bar);
  }
  m.addRigidModel(RigidModel.createCircle(24));
  return m;
};

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

Models.prototype.getCharButton = function(char) {
  var m = new RigidModel();
  var glyphSize = 0.25;
  m.addRigidModel(this.glyphs.models[char]).transformPositions(new Matrix44().toScaleOpXYZ(glyphSize, -glyphSize, 1));
  m.addRigidModel(RigidModel.createCircle(24));
  return m;
};
