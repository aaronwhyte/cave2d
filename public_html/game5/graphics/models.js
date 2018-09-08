/**
 * Common models for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Models(glyphs) {
  this.glyphs = glyphs;
}

/**
 * @enum {number}
 */
let ModelId = (function() {
  let i = 1;
  return {
    CIRCLE_32: i++,
    SEPTAGON: i++,
    SQUARE: i++,
    TUBE_32: i++,
    CYLINDER_32: i++,
    LINE_SEGMENT: i++,

    PAUSE_BUTTON: i++,
    JOIN_BUTTON: i++,
    MENU_BUTTON: i++, // it's unjoin, really
    ONE_BUTTON: i++,
    TWO_BUTTON: i++,

    TEST_BUTTON: i++,
    UNTEST_BUTTON: i++,

    ARROW: i++,
    STAR: i++,

    ACTIVATOR_GUN: i++,
    ANT: i++,
    CENTIPEDE: i++,
    ENTRANCE: i++,
    EXIT: i++,
    INDICATOR: i++,
    MACHINE_GUN: i++,
    PLAYER: i++,
    ROGUE_GUN: i++,
    SHOTGUN: i++
  };
})();

/**
 *
 * @param {ModelId} id
 * @returns {RigidModel}
 */
Models.prototype.createModel = function(id) {
  switch(id) {
    case ModelId.CIRCLE_32: return RigidModel.createCircle(32);
    case ModelId.SEPTAGON: return RigidModel.createCircle(7);
    case ModelId.SQUARE: return RigidModel.createSquare();
    case ModelId.TUBE_32: return RigidModel.createTube(32, false, false);
    case ModelId.CYLINDER_32: return RigidModel.createTube(32, true, true);
    case ModelId.LINE_SEGMENT: return RigidModel.createTube(9, false, false);

    case ModelId.PAUSE_BUTTON: {
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
    }

    case ModelId.JOIN_BUTTON: return this.createCharButton('?');
    case ModelId.MENU_BUTTON: return this.createCharButton('!');
    case ModelId.ONE_BUTTON: return this.createCharButton('1');
    case ModelId.TWO_BUTTON: return this.createCharButton('2');

    case ModelId.TEST_BUTTON:
      return RigidModel.createTriangle()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI/2));

    case ModelId.UNTEST_BUTTON:
      return RigidModel.createTriangle()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI/2));

    case ModelId.ARROW: {
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
    }

    case ModelId.STAR: {
      let model = RigidModel.createCircle(10);
      let inRad = 0.4;
      for (let i = 1; i < 10; i += 2) {
        model.vertexes[i].position.scale1(inRad);
      }
      return model;
    }

    case ModelId.ACTIVATOR_GUN: {
      let model = new RigidModel();
      let body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.3;
      let barrel = RigidModel.createSquare()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
          .addRigidModel(RigidModel.createCircle(9)
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
              .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
          .setColorRGB(0.9, 0.9, 0.9);
      return model.addRigidModel(body).addRigidModel(barrel);
    }

    case ModelId.ANT:
      return RigidModel.createCircle(8)
          .addRigidModel(RigidModel.createSquare()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
          .addRigidModel(RigidModel.createSquare()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
          .setColorRGB(0.1, 0.8, 0.1);

    case ModelId.CENTIPEDE:
      return RigidModel.createCircle(8)
          .addRigidModel(RigidModel.createSquare()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
          .addRigidModel(RigidModel.createSquare()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.4, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)))
          .setColorRGB(1, 0.1, 0.1);

    case ModelId.ENTRANCE:
      return RigidModel.createRingMesh(5, 0.8)
          .setColorRGB(0.7, 0.3, 0.7);

    case ModelId.EXIT:
      return RigidModel.createRingMesh(5, 0.8)
          .setColorRGB(0.2, 0.8, 0.2);

    case ModelId.INDICATOR:
      return RigidModel.createCircle(17)
          .setColorRGB(0.5, 0.5, 0.4);

    case ModelId.MACHINE_GUN: {
      let model = new RigidModel();
      let body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.5;
      let barrel = RigidModel.createSquare()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
          .addRigidModel(RigidModel.createCircle(9)
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
              .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
          .setColorRGB(1, 1, 0);
      return model.addRigidModel(body).addRigidModel(barrel);
    }

    case ModelId.PLAYER:
      return RigidModel.createCircle(24)
          .setColorRGB(1, 1, 1)
          .addRigidModel(RigidModel.createCircle(12)
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(-0.32, 0.23, -0.25))
              .setColorRGB(0, 0, 0))
          .addRigidModel(RigidModel.createCircle(12)
              .transformPositions(new Matrix44().toScaleOpXYZ(0.15, 0.15, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0.32, 0.23, -0.25))
              .setColorRGB(0, 0, 0))
          .addRigidModel(RigidModel.createSquare()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.07, 1))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.37, -0.25))
              .setColorRGB(0, 0, 0));

    case ModelId.ROGUE_GUN: {
      let model = new RigidModel();
      let body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.4;
      let barrel = RigidModel.createSquare()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
          .addRigidModel(RigidModel.createCircle(9)
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
              .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
          .setColorRGB(0.5, 1, 1);
      return model.addRigidModel(body).addRigidModel(barrel);
    }

    case ModelId.SHOTGUN: {
      let model = new RigidModel();
      let body = RigidModel.createCircle(17).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.65;
      let barrel = RigidModel.createSquare()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, -0.1))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, 1))
          .addRigidModel(RigidModel.createCircle(9)
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -0.1))
              .transformPositions(new Matrix44().toScaleOpXYZ(thick, thick, 1)))
          .setColorRGB(1, 0.2, 0.2);
      return model.addRigidModel(body).addRigidModel(barrel);
    }

    default:
      throw Error('unknown model ID: ' + id);
  }
};

Models.prototype.createCharButton = function(char) {
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
