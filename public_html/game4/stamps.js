/**
 * Collection of common stamps for this game, besides the ones the Spirit classes own.
 * @constructor
 */
function Stamps() {
}

Stamps.create = function(renderer) {
  let stamps = new Stamps();
  let models = new Models(null);
  function stamp(modelId) {
    let model = models.createModel(modelId);
    return model.createModelStamp(renderer.gl);
  }
  // TODO: delete these and this whole class, once splashes are fixed
  stamps.circleStamp = stamp(ModelIds.CIRCLE_32);
  stamps.tubeStamp = stamp(ModelIds.TUBE_32);
  stamps.cylinderStamp = stamp(ModelIds.CYLINDER_32);

  return stamps;
};
