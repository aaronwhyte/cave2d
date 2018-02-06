/**
 * Collection of common stamps for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Stamps() {
}

Stamps.create = function(renderer) {

  let stamps = new Stamps();
  let glyphs = new Glyphs(new GlyphMaker(0.4, 1.2));
  glyphs.initModels();
  let models = new Models(glyphs);
  function stamp(model) {
    return model.createModelStamp(renderer.gl);
  }
  // basic geometry
  stamps.circleStamp = stamp(RigidModel.createCircle(32));
  stamps.septagonStamp = stamp(RigidModel.createCircle(7));
  stamps.squareStamp = stamp(RigidModel.createSquare());
  stamps.tubeStamp = stamp(RigidModel.createTube(32));


  stamps.cylinderStamp = stamp(RigidModel.createCylinder(32));
  stamps.cylinderBatchDrawer = batchDrawer(RigidModel.createCylinder(32));


  stamps.lineStamp = stamp(RigidModel.createCylinder(9));

  // fancier stuff
  let model = RigidModel.createCube()
      .createQuadrupleTriangleModel().createQuadrupleTriangleModel().sphereize(Vec4.ZERO, 1);
  for (let i = 0; i < model.vertexes.length; i++) {
    let v = model.vertexes[i];
    let height = 1 - (v.position.getZ() / 2 + 0.5);
    v.color.scale1(height);
  }
  stamps.sphereLowPoly = stamp(model);

  // HUD icons
  stamps.pauseStamp = stamp(models.getPause());
  stamps.joinButton = stamp(models.getJoinButton());
  stamps.button1 = stamp(models.getButton1());
  stamps.button2 = stamp(models.getButton2());
  stamps.menuButton = stamp(models.getMenuButton());
  stamps.testStamp = stamp(models.getTest());
  stamps.untestStamp = stamp(models.getUntest());

  // Game stuff?
  stamps.arrow = stamp(models.getArrow());
  stamps.star = stamp(models.getStar());

  return stamps;
};
