/**
 * A collection of editor-related stamps.
 * @constructor
 */
function EditorStamps() {
}

EditorStamps.create = function(renderer) {
  let stamps = new EditorStamps();
  let models = new EditorModels();

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

  stamps.testTrigger = stamp(models.getTest());
  stamps.untestTrigger = stamp(models.getUntest());
  stamps.pauseTrigger = stamp(models.getPause());
  stamps.undoTrigger = stamp(models.getUndo());
  stamps.redoTrigger = stamp(models.getRedo());

  return stamps;
};

