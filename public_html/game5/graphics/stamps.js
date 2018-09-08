/**
 * Collection of common stamps for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Stamps() {
}

Stamps.create = function(renderer) {

  let stamps = new Stamps();
  let glyphs = new Glyphs(new GlyphMaker(0.4, 1.2), true);
  glyphs.initModels();
  let models = new Models(glyphs);
  function stamp(modelId) {
    let model = models.createModel(modelId);
    return model.createModelStamp(renderer.gl);
  }
  // basic geometry
  stamps.circleStamp = stamp(ModelId.CIRCLE_32);
  stamps.septagonStamp = stamp(ModelId.SEPTAGON);
  stamps.squareStamp = stamp(ModelId.SQUARE);
  stamps.tubeStamp = stamp(ModelId.TUBE_32);
  stamps.cylinderStamp = stamp(ModelId.CYLINDER_32);
  stamps.lineStamp = stamp(ModelId.LINE_SEGMENT);

  // HUD icons
  stamps.pauseStamp = stamp(ModelId.PAUSE_BUTTON);
  stamps.joinButton = stamp(ModelId.JOIN_BUTTON);
  stamps.button1 = stamp(ModelId.ONE_BUTTON);
  stamps.button2 = stamp(ModelId.TWO_BUTTON);
  stamps.menuButton = stamp(ModelId.MENU_BUTTON);
  stamps.testStamp = stamp(ModelId.TEST_BUTTON);
  stamps.untestStamp = stamp(ModelId.UNTEST_BUTTON);

  // Game stuff?
  stamps.arrow = stamp(ModelId.ARROW);
  stamps.star = stamp(ModelId.STAR);

  return stamps;
};
