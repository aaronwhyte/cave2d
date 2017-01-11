/**
 * Common models for this editor.
 * @constructor
 */
function EditorModels() {
}

EditorModels.cursorIconRad = 0.43;

EditorModels.prototype.getCursor = function() {
  var model = new RigidModel();
  var arrowHead = RigidModel.createTriangle();
  arrowHead.vertexes[0].position.setXYZ(0, 0, 0);
  arrowHead.vertexes[1].position.setXYZ(-0.4, -0.5, 0);
  arrowHead.vertexes[2].position.setXYZ(0.4, -0.5, 0);
  var arrowShaft = RigidModel.createSquare()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.35, 1))
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.7, 0));
  model.addRigidModel(arrowHead).addRigidModel(arrowShaft);
  model.transformPositions(new Matrix44().toScaleOpXYZ(1.1, 1.1, 1));
  model.addRigidModel(RigidModel.createTube(32).transformPositions(new Matrix44().toScaleOpXYZ(0.9, 0.9, 1)));
  return model;
};

EditorModels.prototype.getTriggerBackground = function() {
  return RigidModel.createSquare().transformPositions(
      new Matrix44().toTranslateOpXYZ(0, 0, 0.1))
      .setColorRGB(0.3, 0.3, 0.3);
};

EditorModels.prototype.getAddTrigger = function() {
  return RigidModel.createSquare()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.65, 0.15, 1))
      .addRigidModel(RigidModel.createSquare().transformPositions(
          new Matrix44().toScaleOpXYZ(0.15, 0.65, 1)))
      .addRigidModel(this.getTriggerBackground());
};

EditorModels.prototype.getRemoveTrigger = function() {
  return RigidModel.createSquare().transformPositions(new Matrix44().toScaleOpXYZ(0.65, 0.15, 1))
      .addRigidModel(RigidModel.createSquare().transformPositions(
          new Matrix44().toScaleOpXYZ(0.15, 0.65, 1)))
      .transformPositions(new Matrix44().toRotateZOp(Math.PI / 4))
      .addRigidModel(this.getTriggerBackground());
};

EditorModels.prototype.getGripTrigger = function() {
  // TODO make this a hand, not a compass.
  var model = RigidModel.createCircleMesh(3).transformPositions(new Matrix44().toScaleOpXYZ(0.3, 0.3, 1))
      .addRigidModel(RigidModel.createRingMesh(4, 0.8).transformPositions(
          new Matrix44().toScaleOpXYZ(0.6, 0.6, 1)))
      .addRigidModel(this.getTriggerBackground());
  for (var i = 0; i < 4; i++) {
    model.addRigidModel(RigidModel.createTriangle().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toRotateZOp(i * Math.PI / 2))
            .multiply(new Matrix44().toTranslateOpXYZ(0, 0.76, 0))
            .multiply(new Matrix44().toScaleOpXYZ(0.06, 0.06, 1))
    ));
  }
  return model;
};

EditorModels.prototype.getDigTrigger = function() {
  var model = new RigidModel();
  for (var x = -7.5; x <= 7.5; x++) {
    var indent = 0;
    if (Math.abs(x) < 2) indent = 4 / 8;
    else if (Math.abs(x) < 3) indent = 3 / 8;
    else if (Math.abs(x) < 4) indent = 2 / 8;
    model.addRigidModel(RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toTranslateOpXYZ(x / 8, -1, 0.05))
            .multiply(new Matrix44().toScaleOpXYZ(1 / 16, 0.5 * (1 - indent), 1))
            .multiply(new Matrix44().toTranslateOpXYZ(0, 1, 0))));
  }
  model.addRigidModel(RigidModel.createRingMesh(5, 0.8).transformPositions(
      new Matrix44()
          .multiply(new Matrix44().toScaleOpXYZ(EditorModels.cursorIconRad, EditorModels.cursorIconRad, 1)))
      .setColorRGB(1, 1, 1));
  model.addRigidModel(this.getTriggerBackground());
  return model;
};

EditorModels.prototype.getFillTrigger = function() {
  var model = new RigidModel();
  for (var x = -7.5; x <= 7.5; x++) {
    var outdent = 0;
    if (Math.abs(x) < 2) outdent = 4/8;
    else if (Math.abs(x) < 3) outdent = 3/8;
    else if (Math.abs(x) < 4) outdent = 2/8;
    model.addRigidModel(RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toTranslateOpXYZ(x/8, -1, 0.05))
            .multiply(new Matrix44().toScaleOpXYZ(1/16, 0.5 * (1 + outdent), 1))
            .multiply(new Matrix44().toTranslateOpXYZ(0, 1, 0))));
  }
  model.addRigidModel(RigidModel.createRingMesh(5, 0.8).transformPositions(
      new Matrix44()
          .multiply(new Matrix44().toScaleOpXYZ(EditorModels.cursorIconRad, EditorModels.cursorIconRad, 1)))
      .setColorRGB(0.5, 0.5, 0.5));
  model.addRigidModel(this.getTriggerBackground());
  return model;
};

EditorModels.prototype.getAddMenuIndicator = function() {
  var model = new RigidModel();
  var size = 1.5;
  var brightness = 0.5;
  var thickness = 0.3;
  var length = 0.5 + thickness;
  for (var i = 0; i < 4; i++) {
    model
        .addRigidModel(RigidModel.createSquare().transformPositions(
            new Matrix44()
                .multiply(new Matrix44().toScaleOpXYZ(size, size, 1))
                .multiply(new Matrix44().toRotateZOp(i * Math.PI/2))
                .multiply(new Matrix44().toTranslateOpXYZ(-1 + length/2 - thickness, -1 - thickness/2, 0))
                .multiply(new Matrix44().toScaleOpXYZ(length/2, thickness/2, 1))
        ))
        .addRigidModel(RigidModel.createSquare().transformPositions(
            new Matrix44()
                .multiply(new Matrix44().toScaleOpXYZ(size, size, 1))
                .multiply(new Matrix44().toRotateZOp(i * Math.PI/2))
                .multiply(new Matrix44().toTranslateOpXYZ(-1 - thickness/2, -1 + length/2 - thickness, 0))
                .multiply(new Matrix44().toScaleOpXYZ(thickness/2, length/2, 1))
        ));
  }
  model.setColorRGB(brightness, brightness, brightness);
  return model;
};


EditorModels.prototype.getPause = function() {
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

EditorModels.prototype.getTest = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(-Math.PI/2));
};

EditorModels.prototype.getUntest = function() {
  return RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(Math.PI/2));
};

EditorModels.prototype.getUndo = function() {
  var m = new RigidModel.createTriangle()
      .transformPositions(new Matrix44().toRotateZOp(Math.PI/2))
      .transformPositions(new Matrix44().toScaleOpXYZ(0.17, 0.25, 1))
      .transformPositions(new Matrix44().toTranslateOpXYZ(0.1, 0, 0));
  m.addRigidModel(RigidModel.createSquare().transformPositions(
      new Matrix44()
          .multiply(new Matrix44().toTranslateOpXYZ(0.4, 0, 0))
          .multiply(new Matrix44().toScaleOpXYZ(0.4, 0.1, 1))));
  m.addRigidModel(RigidModel.createSquare().transformPositions(
      new Matrix44()
          .multiply(new Matrix44().toTranslateOpXYZ(0.85, 0.4, 0))
          .multiply(new Matrix44().toScaleOpXYZ(0.1, 0.35, 1))));
  m.addRigidModel(RigidModel.createSquare().transformPositions(
      new Matrix44()
          .multiply(new Matrix44().toTranslateOpXYZ(0.4, 0.8, 0))
          .multiply(new Matrix44().toScaleOpXYZ(0.4, 0.1, 1))));
  m.transformPositions(new Matrix44().toTranslateOpXYZ(-0.45, -0.3, 0));
  return m;
};

EditorModels.prototype.getRedo = function() {
  return this.getUndo().transformPositions(new Matrix44().toScaleOpXYZ(-1, 1, 1));
};

