/**
 * A collection of models, stamps, and batchDrawers, keyed by whatever the caller wants.
 * This has a unified draw() that works for stamps and batchDrawers, plus a flush() that
 * flushes all the batchDrawers that need flushing.
 * @param renderer
 * @constructor
 */
function DrawPack(renderer) {
  this.renderer = renderer;
  this.models = new Map();
  this.stamps = new Map();
  this.batchers = new Map();
}

/**
 * Adds a model, creating a stamp or a batchDrawer depending on batchSize.
 * @param id The caller-defined key. Re-adding something that was already added will cause an error!
 * @param {RigidModel} model
 * @param {number} batchSize If this is less than 2, then a batchDrawer won't be created. Regular stamps will be used.
 */
DrawPack.prototype.addModel = function(id, model, batchSize) {
  this.models.set(id, model);
  this.stamps.set(id, model.createModelStamp(this.renderer.gl));
  if (batchSize && batchSize > 1) {
    let stamps = model.createModelStampBatches(this.renderer.gl, batchSize);
    this.batchers.set(id, new BatchDrawer(stamps, this.renderer));
  }
};

/**
 * Draws a previously added model, using a batchDrawer or a stamp, depending on how the model was added.
 * @param {number} id
 * @param {Vec4} color
 * @param {Matrix44} matrix
 * @param {Matrix44=} matrix2
 */
DrawPack.prototype.draw = function(id, color, matrix, matrix2) {
  let batcher = this.batchers.get(id);
  if (batcher) {
    batcher.batchDraw(color, matrix, matrix2);
  } else {
    let stamp = this.stamps.get(id);
    if (stamp) {
      this.renderer.setColorVector(color)
          .setModelMatrix(matrix);
      if (matrix2) {
        this.renderer.setModelMatrix2(matrix2)
      }
      this.renderer.drawStamp();
    } else {
      throw Error('DrawPack has no batcher or stamp for id: ' + id);
    }
  }
};

/**
 * Flush all batchDrawers.
 */
DrawPack.prototype.flush = function() {
  for (let k of this.batchers.getKeys()) {
    this.batchers.get(k).flush();
  }
};