/**
 * Manages GL Stamps and World Body objects that reflect a BitGrid where
 * 0 is solid wall and 1 is the void.
 * @constructor
 */
function TileGrid(bitGrid, renderer, world, hitGroup) {
  this.bitGrid = bitGrid;
  this.renderer = renderer;
  this.world = world;
  this.hitGroup = hitGroup;

  this.tiles = {};
  this.segment = new Segment(new Vec2d(), new Vec2d());
  this.wallGrip = 0.9;

  // array accumuating changes while recording, or null if not recording.
  this.changes = null;

  // temp cache
  this.cellIdsToDraw = new ObjSet();
  this.v0 = new Vec2d();
  this.v1 = new Vec2d();
  this.rect = new Rect();
  this.mat44 = new Matrix44();
}

TileGrid.prototype.setWallGrip = function(grip) {
  this.wallGrip = grip;
  return this;
};

/**
 * Mutates the grid contents with a "drawing" stroke. Nothing to do with rendering on the screen.
 * @param {Vec2d} p1
 * @param {Vec2d} p2
 * @param {number} rad
 * @param {number} color
 * @return {Array.<number>} A freshly allocated array of changed cell IDs
 */
TileGrid.prototype.drawTerrainPill = function(p1, p2, rad, color) {
  this.segment.setP1P2(p1, p2);
  this.bitGrid.drawPill(this.segment, rad, color);
  return this.flushTerrainChanges();
};

/**
 * Draws the visible tiles using the renderer.
 */
TileGrid.prototype.drawTiles = function(worldX, worldY, pixelsPerCell) {
  var cx = this.getCellIndexAtWorld(worldX);
  var cy = this.getCellIndexAtWorld(worldY);
  var cellsPerScreenX = this.renderer.canvas.width / pixelsPerCell;
  var cellsPerScreenY = this.renderer.canvas.height / pixelsPerCell;
  var rx = Math.ceil(cellsPerScreenX);
  var ry = Math.ceil(cellsPerScreenY);
  for (var dy = -ry; dy <= ry; dy++) {
    for (var dx = -rx; dx <= rx; dx++) {
      this.drawTileAtCellXY(cx + dx, cy + dy);
    }
  }
};

/**
 * Draws the visible tiles using the renderer.
 */
TileGrid.prototype.drawTilesOverlappingCircles = function(circles) {
  this.cellIdsToDraw.reset();
  for (var i = 0; i < circles.length; i++) {
    var circle = circles[i];
    if (!circle) continue;
    this.addCellIdsOverlappingCircle(this.cellIdsToDraw, circle);
  }
  for (var cellId in this.cellIdsToDraw.vals) {
    this.drawTileAtCellId(cellId);
  }
};

/**
 * Finds cells overlapping the world-coord circle, and puts thier cellIds into the objSet
 * @param objSet THe set to write to
 * @param circle in world coords
 */
TileGrid.prototype.addCellIdsOverlappingCircle = function(objSet, circle) {
  var x0 = this.getCellIndexAtWorld(circle.pos.x - circle.rad);
  var x1 = this.getCellIndexAtWorld(circle.pos.x + circle.rad);
  var y0 = this.getCellIndexAtWorld(circle.pos.y - circle.rad);
  var y1 = this.getCellIndexAtWorld(circle.pos.y + circle.rad);
  var rectRad = this.v1.setXY(this.bitGrid.cellWorldSize/2, this.bitGrid.cellWorldSize/2);
  for (var cy = y0; cy <= y1; cy++) {
    for (var cx = x0; cx <= x1; cx++) {
      var rectPos = this.v0.setXY((cx + 0.5) * this.bitGrid.cellWorldSize, (cy + 0.5) * this.bitGrid.cellWorldSize);
      if (OverlapDetector.isRectOverlappingCircle(rectPos, rectRad, circle.pos, circle.rad)) {
        objSet.put(this.bitGrid.getCellIdAtIndexXY(cx, cy));
      }
    }
  }
};


TileGrid.prototype.getCellIndexAtWorld = function(worldVal) {
  return Math.round((worldVal - 0.5 * this.bitGrid.cellWorldSize) / this.bitGrid.cellWorldSize);
};

/**
 * Lazily creates the tile stamp, and draws it.
 * @param cx
 * @param cy
 */
TileGrid.prototype.drawTileAtCellXY = function(cx, cy) {
  this.drawTileAtCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.drawTileAtCellId = function(cellId) {
  var tile = this.tiles[cellId];
  if (!tile) {
    tile = this.loadCellId(cellId);
  }
  if (!tile.stamp) {
    tile.stamp = this.createTileStampForCellId(cellId);
  }
  if (tile.stamp) {
    this.renderer.setStamp(tile.stamp).drawStamp();
  }
};

TileGrid.prototype.getStampAtCellXY = function(cx, cy) {
  return this.getStampAtCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.getStampAtCellId = function(cellId) {
  this.world.pauseRecordingChanges();
  this.loadCellId(cellId);
  this.world.resumeRecordingChanges();
  var tile = this.tiles[cellId];
  return tile && tile.stamp;
};

TileGrid.prototype.startRecordingChanges = function() {
  this.bitGrid.startRecordingChanges();
};

TileGrid.prototype.stopRecordingChanges = function() {
  var changes = this.bitGrid.stopRecordingChanges();
  for (var i = 0; i < changes.length; i++) {
    var c = changes[i];
    // TODO: Decorate changes with before and after rects, in world coords
  }
  return changes;
};

TileGrid.prototype.applyChanges = function(changes) {
  this.bitGrid.applyChanges(changes);
  this.flushTerrainChanges();
};

/**
 * @returns {Array.<number>} Freshly allocated array of cell IDs that changed
 */
TileGrid.prototype.flushTerrainChanges = function() {
  this.world.pauseRecordingChanges();
  var changedCellIds = this.bitGrid.flushChangedCellIds();
  if (changedCellIds.length) {
    for (var i = 0; i < changedCellIds.length; i++) {
      this.changeTerrain(changedCellIds[i]);
    }
  }
  this.world.resumeRecordingChanges();
  return changedCellIds;
};


////////////
// private
////////////

/**
 * The cell at the cellId definitely changes, so unload it and reload it.
 * Make sure the four cardinal neighbors are also loaded.
 * @param cellId
 */
TileGrid.prototype.changeTerrain = function(cellId) {
  var center = Vec2d.alloc();
  this.bitGrid.cellIdToIndexVec(cellId, center);
  this.loadCellXY(center.x - 1, center.y);
  this.loadCellXY(center.x + 1, center.y);
  this.loadCellXY(center.x, center.y - 1);
  this.loadCellXY(center.x, center.y + 1);
  this.unloadCellXY(center.x, center.y);
  this.loadCellXY(center.x, center.y);
  center.free();
};

TileGrid.prototype.loadCellXY = function(cx, cy) {
  this.loadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.loadCellId = function(cellId) {
  var tile = this.tiles[cellId];
  if (!tile) {
    this.tiles[cellId] = tile = {
      cellId: cellId,
      stamp: null,
      bodyIds: null
    };
  }
  if (!tile.bodyIds) {
    tile.bodyIds = [];
    // Create wall bodies and remember their IDs.
    var rects = this.bitGrid.getRectsOfColorForCellId(0, cellId);
    for (var r = 0; r < rects.length; r++) {
      var rect = rects[r];
      var body = this.createWallBody(rect);
      tile.bodyIds.push(this.world.addBody(body));
    }
  }
  return tile;
};

TileGrid.prototype.unloadCellXY = function(cx, cy) {
  this.unloadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.unloadCellId = function(cellId) {
  var tile = this.tiles[cellId];
  if (!tile) return;
  if (tile.stamp) {
    tile.stamp.dispose(this.renderer.gl);
    tile.stamp = null;
  }
  if (tile.bodyIds) {
    for (var i = 0; i < tile.bodyIds.length; i++) {
      var id = tile.bodyIds[i];
      this.world.removeBodyId(id);
    }
    tile.bodyIds = null;
  }
};

/**
 * Creates a body, but does not add it to the world.
 */
TileGrid.prototype.createWallBody = function(rect) {
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosAtTime(rect.pos, this.world.now);
  b.rectRad.set(rect.rad);
  b.hitGroup = this.hitGroup;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  b.grip = this.wallGrip;
  return b;
};

/**
 * Creates a single default stamp out of all the wall rects in a tile, just by concatenating them together.
 * @param cellId
 * @returns {ModelStamp}
 */
TileGrid.prototype.createTileStampForCellId = function(cellId) {
  //var rects = this.bitGrid.getTinyRectsOfColorForCellId(0, cellId);
  var rects = this.bitGrid.getRectsOfColorForCellId(0, cellId);

  var model = new RigidModel();
  for (var i = 0; i < rects.length; i++) {
    var r = Math.random() * 0.3 + 0.7;
    model.addRigidModel(this.createWallModel(rects[i]).setColorRGB(r, r, r));
    //model.addRigidModel(this.createWallModel(rects[i]));
  }
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;

  model.addRigidModel(this.createFloorModelForCellXY(cx, cy));
  return model.createModelStamp(this.renderer.gl);
};

TileGrid.prototype.createWallModel = function(rect) {
  var transformation = this.mat44
      .toTranslateOpXYZ(rect.pos.x, rect.pos.y, 0)
      .multiply(new Matrix44().toScaleOpXYZ(rect.rad.x, rect.rad.y, 1));
  var wallModel = RigidModel.createSquare().transformPositions(transformation);
  // TODO: color options? I guess this method could be overridden in a pinch.
  // wallModel.setColorRGB(
  //     Math.sin(rect.pos.y * rect.pos.x * 0.1 + 1) < -0.999 ? 0.8 : 1,
  //     Math.sin(rect.pos.y * rect.pos.x * 0.13 + 2) < -0.999 ? 0.8 : 1,
  //     Math.sin(rect.pos.y * rect.pos.x * 0.17 + 3) < -0.999 ? 0.8 : 1);
  wallModel.setColorRGB(1, 1, 1);
  return wallModel;
};

TileGrid.prototype.createFloorModelForCellXY = function(cx, cy) {
  var x = (cx + 0.5) * this.bitGrid.cellWorldSize - this.bitGrid.bitWorldSize/2;
  var y = (cy + 0.5) * this.bitGrid.cellWorldSize - this.bitGrid.bitWorldSize/2;
  var r = this.bitGrid.cellWorldSize / 2;
  this.rect.setPosXY(x, y);
  var transformation = new Matrix44()
      .toTranslateOpXYZ(x, y, 0.999)
      .multiply(new Matrix44().toScaleOpXYZ(r, r, 1));
  var wallModel = RigidModel.createSquare().transformPositions(transformation);
  // TODO: color options?
  wallModel.setColorRGB(0.25, 0.18, 0.25);
  return wallModel;
};

TileGrid.prototype.unloadAllCells = function() {
  for (var cellId in this.tiles) {
    this.unloadCellId(cellId);
  }
};