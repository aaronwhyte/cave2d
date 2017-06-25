/**
 * Collection of common stamps for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Stamps() {
}

Stamps.create = function(renderer) {
  var stamps = new Stamps();
  var glyphs = new Glyphs(new GlyphMaker(0.4, 1.2));
  glyphs.initModels();
  var models = new Models(glyphs);
  function stamp(model) {
    return model.createModelStamp(renderer.gl);
  }
  // basic geometry
  stamps.squareStamp = stamp(RigidModel.createSquare());
  stamps.circleStamp = stamp(RigidModel.createCircle(32));
  stamps.tubeStamp = stamp(RigidModel.createTube(32));
  stamps.cylinderStamp = stamp(RigidModel.createCylinder(32));
  stamps.lineStamp = stamp(RigidModel.createCylinder(9));

  // HUD icons
  stamps.pauseStamp = stamp(models.getPause());
  stamps.joinButton = stamp(models.getJoinButton());
  stamps.button1 = stamp(models.getButton1());
  stamps.button2 = stamp(models.getButton2());
  stamps.menuButton = stamp(models.getMenuButton());

  return stamps;
};

