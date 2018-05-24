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
  stamps.circleStamp = stamp(ModelIds.CIRCLE_32);
  stamps.septagonStamp = stamp(ModelIds.SEPTAGON);
  stamps.squareStamp = stamp(ModelIds.SQUARE);
  stamps.tubeStamp = stamp(ModelIds.TUBE_32);
  stamps.cylinderStamp = stamp(ModelIds.CYLINDER_32);
  stamps.lineStamp = stamp(ModelIds.LINE_SEGMENT);

  // HUD icons
  stamps.pauseStamp = stamp(ModelIds.PAUSE_BUTTON);
  stamps.joinButton = stamp(ModelIds.JOIN_BUTTON);
  stamps.button1 = stamp(ModelIds.ONE_BUTTON);
  stamps.button2 = stamp(ModelIds.TWO_BUTTON);
  stamps.menuButton = stamp(ModelIds.MENU_BUTTON);
  stamps.testStamp = stamp(ModelIds.TEST_BUTTON);
  stamps.untestStamp = stamp(ModelIds.UNTEST_BUTTON);

  // Game stuff?
  stamps.arrow = stamp(ModelIds.ARROW);
  stamps.star = stamp(ModelIds.STAR);

  return stamps;
};
