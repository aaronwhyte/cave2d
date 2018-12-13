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
  let i = 0;
  return {
    CIRCLE_32: ++i,
    SEPTAGON: ++i,
    SQUARE: ++i,
    TRIANGLE: ++i,
    TUBE_32: ++i,
    CYLINDER_32: ++i,
    LINE_SEGMENT: ++i,
    CUBE: ++i,
    SPHERE_2: ++i,
    SPHERE_3: ++i,
    SPHERE_4: ++i,

    PAUSE_BUTTON: ++i,
    JOIN_BUTTON: ++i,
    MENU_BUTTON: ++i, // it's unjoin, really
    ACTION_0: ++i,
    ACTION_1: ++i,
    DROP_ITEM: ++i,
    EQUIP_ITEM: ++i,

    TEST_BUTTON: ++i,
    UNTEST_BUTTON: ++i,

    ARROW: ++i,
    STAR: ++i,

    ENTRANCE: ++i,
    EXIT: ++i,

    ANT: ++i,

    PLAYER: ++i,

    SLOW_SHOOTER: ++i,
    MEDIUM_SHOOTER: ++i,
    LASER_WEAPON: ++i,
    MINE: ++i,
    MINE_RETRACTED: ++i,
    MINE_THROWER: ++i
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
    case ModelId.TRIANGLE: return RigidModel.createTriangle();
    case ModelId.TUBE_32: return RigidModel.createTube(32, false, false);
    case ModelId.CYLINDER_32: return RigidModel.createTube(32, true, true);
    case ModelId.LINE_SEGMENT: return RigidModel.createTube(9, false, false);
    case ModelId.CUBE: return RigidModel.createCube();
    case ModelId.SPHERE_2: return RigidModel.createOctahedron()
        .createQuadrupleTriangleModel()
        .sphereize(Vec4.ZERO, 1);
    case ModelId.SPHERE_3: return RigidModel.createOctahedron()
        .createQuadrupleTriangleModel()
        .createQuadrupleTriangleModel()
        .sphereize(Vec4.ZERO, 1);
    case ModelId.SPHERE_4: return RigidModel.createOctahedron()
        .createQuadrupleTriangleModel()
        .createQuadrupleTriangleModel()
        .createQuadrupleTriangleModel()
        .sphereize(Vec4.ZERO, 1);

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
    case ModelId.ACTION_0: return this.createCharButton('A');
    case ModelId.ACTION_1: return this.createCharButton('B');
    case ModelId.DROP_ITEM: return this.createCharButton('-');
    case ModelId.EQUIP_ITEM: return this.createCharButton('*');

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

    case ModelId.ANT:
      return this.createModel(ModelId.SPHERE_3)
          .addRigidModel(RigidModel.createCube()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.2, 0.5, 0.2))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(Math.PI / 6)))
          .addRigidModel(RigidModel.createCube()
              .transformPositions(new Matrix44().toScaleOpXYZ(0.2, 0.5, 0.2))
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
              .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 6)))
          .setColorRGB(0.1, 0.8, 0.1);

    case ModelId.ENTRANCE:
      return RigidModel.createRingMesh(5, 0.8)
          .setColorRGB(0.7, 0.3, 0.7);

    case ModelId.EXIT:
      return this.createModel(ModelId.SPHERE_4)
          .setColorRGB(0.2, 0.8, 0.2);

    case ModelId.PLAYER:
      return this.createModel(ModelId.SPHERE_3)
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

    case ModelId.SLOW_SHOOTER: {
      let model = new RigidModel();
      let body = this.createModel(ModelId.SPHERE_3).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.5;
      let barrel = RigidModel.createCube()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, thick))
          .setColorRGB(1, 1, 0);
      return model.addRigidModel(body).addRigidModel(barrel)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.99, 0.99, 0.99, ));
    }

    case ModelId.MEDIUM_SHOOTER: {
      let model = new RigidModel();
      let body = this.createModel(ModelId.SPHERE_3).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.4;
      let barrel = RigidModel.createCube()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, thick))
          .setColorRGB(0.5, 1, 1);
      return model.addRigidModel(body).addRigidModel(barrel)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.99, 0.99, 0.99, ));
    }

    case ModelId.LASER_WEAPON: {
      let model = new RigidModel();
      let body = this.createModel(ModelId.SPHERE_3).setColorRGB(0.5, 0.5, 0.5);
      let thick = 0.65;
      let barrel = RigidModel.createCube()
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toScaleOpXYZ(thick, 0.6, thick))
          .setColorRGB(1, 0.2, 0.2);
      return model.addRigidModel(body).addRigidModel(barrel)
          .transformPositions(new Matrix44().toScaleOpXYZ(0.99, 0.99, 0.99, ));
    }

    case ModelId.MINE_THROWER:
    case ModelId.MINE: {
      let model = this.createModel(ModelId.SPHERE_3)
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, 0));
      model.setColorRGB(0.7, 0.7, 0.7);
      for (let i = 0, n = 10; i < n; i++) {
        let spike = new RigidModel.createCube()
            .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
            .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1.15, -0.1))
            .transformPositions(new Matrix44().toRotateXOp(((i % 2) - 0.5) *Math.PI / 3))
            .transformPositions(new Matrix44().toRotateZOp(i * 2 * Math.PI / n));
        spike.setColorRGB(0.7, 0.7, 0.7);
        model.addRigidModel(spike);
      }
      let spike = new RigidModel.createCube()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1.15, -0.1))
          .transformPositions(new Matrix44().toRotateXOp(-Math.PI / 2));
      spike.setColorRGB(0.7, 0.7, 0.7);
      model.addRigidModel(spike);
      spike = new RigidModel.createCube()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1.15, -0.1))
          .transformPositions(new Matrix44().toRotateXOp(Math.PI / 2));
      spike.setColorRGB(0.7, 0.7, 0.7);
      model.addRigidModel(spike);

      model.transformPositions(new Matrix44().toRotateYOp(0.05));
      return model;
    }

    case ModelId.MINE_RETRACTED: {
      let model = this.createModel(ModelId.SPHERE_3)
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, 0));
      model.setColorRGB(1, 0.2, 0.2);
      for (let i = 0, n = 10; i < n; i++) {
        let spike = new RigidModel.createCube()
            .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
            .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0.9, -0.1))
            .transformPositions(new Matrix44().toRotateXOp(((i % 2) - 0.5) *Math.PI / 3))
            .transformPositions(new Matrix44().toRotateZOp(i * 2 * Math.PI / n));
        spike.setColorRGB(0.8, 0.2, 0.2);
        model.addRigidModel(spike);
      }
      let spike = new RigidModel.createCube()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0.9, -0.1))
          .transformPositions(new Matrix44().toRotateXOp(-Math.PI / 2));
      spike.setColorRGB(0.8, 0.2, 0.2);
      spike = new RigidModel.createCube()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.16, 0.2, 0.16))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0.9, -0.1))
          .transformPositions(new Matrix44().toRotateXOp(Math.PI / 2));
      spike.setColorRGB(0.8, 0.2, 0.2);
      model.addRigidModel(spike);
      return model;
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
