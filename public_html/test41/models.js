/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models() {
}

Models.prototype.getPlayerPause = function() {
  var m = this.getEditorPause();
  m.addRigidModel(RigidModel.createCircle(24));
  return m;
};

Models.prototype.getEditorPause = function() {
  var m = new RigidModel();
  for (var x = -1; x <= 1; x += 2) {
    var bar = RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.2, 0.5, 1)
                .multiply(new Matrix44().toTranslateOpXYZ(x * 1.5, 0, 0.9)
            )));
    m.addRigidModel(bar);
  }
  return m;
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

Models.prototype.getEditorUndo = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(Math.PI/2));
};

Models.prototype.getEditorRedo = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(-Math.PI/2));
};

