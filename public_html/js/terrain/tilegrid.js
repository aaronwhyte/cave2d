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
}

TileGrid.prototype.drawTerrainPill = function(p1, p2, rad, color) {
  this.segment.setP1P2(p1, p2);
  this.bitGrid.drawPill(this.segment, rad, color);
  this.flushTerrainChanges();
};

TileGrid.prototype.getStampAtCellXY = function(cx, cy) {
  this.loadCellXY(cx, cy);
  var cellId = this.bitGrid.getCellIdAtIndexXY(cx, cy);
  var tile = this.tiles[cellId];
  return tile && tile.stamp;
};


////////////
// private
////////////

TileGrid.prototype.flushTerrainChanges = function() {
  var changedCellIds = this.bitGrid.flushChangedCellIds();
  for (var i = 0; i < changedCellIds.length; i++) {
    this.changeTerrain(changedCellIds[i]);
  }
};

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
  var cellId = this.bitGrid.getCellIdAtIndexXY(cx, cy);
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
  // TODO don't create a stamp until a stampless tiles is actually being rendered.
  // TODO don't repeat stamp for 100% solid tiles.
  if (!tile.stamp) {
    if (!rects) rects = this.bitGrid.getRectsOfColorForCellId(0, cellId);
    tile.stamp = this.createTileStamp(rects);
  }
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
 * Creates a single stamp out of all the rects in a tile.
 * @param rects
 * @returns {ModelStamp}
 */
TileGrid.prototype.createTileStamp = function(rects) {
  var model = new RigidModel();
  for (var i = 0; i < rects.length; i++) {
    model.addRigidModel(this.createWallModel(rects[i]));
  }
  return model.createModelStamp(this.renderer.gl);
};

TileGrid.prototype.createWallModel = function(rect) {
  var transformation = new Matrix44()
      .toTranslateOpXYZ(rect.pos.x, rect.pos.y, 0)
      .multiply(new Matrix44().toScaleOpXYZ(rect.rad.x, rect.rad.y, 1));
  var wallModel = RigidModel.createSquare().transformPositions(transformation);
  // TODO: color options? I guess this method could be overridden in a pinch.
  wallModel.setColorRGB(1, 1, 1);
  return wallModel;
};

TileGrid.prototype.unloadAllCells = function() {
  for (var cellId in this.tiles) {
    this.unloadCellId(cellId);
  }
};