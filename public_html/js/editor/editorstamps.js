/**
 * A collection of editor-related stamps.
 * @constructor
 */
function EditorStamps() {
}

EditorStamps.create = function(renderer) {
  var stamps = new EditorStamps();
  var models = new EditorModels();

  function stamp(model) {
    return model.createModelStamp(renderer.gl);
  }

  stamps.cursor = stamp(models.getCursor());
  stamps.indicator = stamp(RigidModel.createTube(64));
  stamps.circle = stamp(RigidModel.createCircleMesh(5));

  stamps.addTrigger = stamp(models.getAddTrigger());
  stamps.removeTrigger = stamp(models.getRemoveTrigger());
  stamps.gripTrigger = stamp(models.getGripTrigger());
  stamps.digTrigger = stamp(models.getDigTrigger());
  stamps.fillTrigger = stamp(models.getFillTrigger());
  stamps.addMenuIndicator = stamp(models.getAddMenuIndicator());
  return stamps;
};

