/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models() {
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
