/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models(glyphs) {
  this.glyphs = glyphs;
}

Models.prototype.getPause = function() {
  let m = new RigidModel();
  for (let x = -1; x <= 1; x += 2) {
    let bar = RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1)
                .multiply(new Matrix44().toTranslateOpXYZ(x * 3.25, 0, 0.9)
                )));
    m.addRigidModel(bar);
  }
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
  let m = new RigidModel();
  let glyphSize = 0.25;
  let c = RigidModel.createCircle(24).setColorRGBA(0.5, 0.5, 0.5, 0.7);
  m.addRigidModel(this.glyphs.models[char])
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.001))
      .transformPositions(new Matrix44().toScaleOpXYZ(glyphSize, -glyphSize, 1))
      .setColorRGBA(1, 1, 1, 1);
  m.addRigidModel(c);
  return m;
};

Models.prototype.getArrow = function() {
  let model = new RigidModel();
  let arrowHead = RigidModel.createTriangle();
  arrowHead.vertexes[0].position.setXYZ(0, 0, 0);
  arrowHead.vertexes[1].position.setXYZ(-0.4, -0.5, 0);
  arrowHead.vertexes[2].position.setXYZ(0.4, -0.5, 0);
  let arrowShaft = RigidModel.createSquare()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.3, 1))
      .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.7, 0));
  model.addRigidModel(arrowHead).addRigidModel(arrowShaft);
  return model;
};

Models.prototype.getStar = function() {
  let model = RigidModel.createCircle(10);
  let inRad = 0.4;
  for (let i = 1; i < 10; i += 2) {
    model.vertexes[i].position.scale1(inRad);
  }
  return model;
};
