/**
 * Collection of common stamps for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Stamps() {
}

Stamps.create = function(renderer) {
  var stamps = new Stamps();
  var models = new Models();
  function stamp(model) {
    return model.createModelStamp(renderer.gl);
  }
  // basic geometry
  stamps.circleStamp = stamp(RigidModel.createCircle(32));
  stamps.tubeStamp = stamp(RigidModel.createTube(32));
  stamps.cylinderStamp = stamp(RigidModel.createCylinder(32));

  // HUD icons
  stamps.playerPauseStamp = stamp(models.getPlayerPause());
  stamps.testStamp = stamp(models.getTest());
  stamps.untestStamp = stamp(models.getUntest());

  return stamps;
};
