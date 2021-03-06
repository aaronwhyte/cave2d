/**
 * Manages GL Stamps and World Body objects that reflect a BitGrid where
 * 0 is solid wall and 1 is the void.
 * @constructor
 */
function TileGrid(bitGrid, renderer, world, hitGroup, opt_useFans) {
  this.bitGrid = bitGrid;
  this.renderer = renderer;
  this.world = world;
  this.hitGroup = hitGroup;
  this.useFans = !!opt_useFans;

  this.tiles = {};
  this.segment = new Segment(new Vec2d(), new Vec2d());
  this.wallGrip = 0.9;

  // array accumulating changes while recording, or null if not recording.
  this.changes = null;

  // temp cache
  this.cellIdsToDraw = new Set();
  this.v0 = new Vec2d();
  this.v1 = new Vec2d();
  this.rect = new Rect();
  this.mat44 = new Matrix44();

  this.flushNum = 1;

  this.wallColor = 0;
}

TileGrid.prototype.setWallGrip = function(grip) {
  this.wallGrip = grip;
  return this;
};

/**
 * Zero for the default - tunnels in an endless ground,
 * or one for walls in an endless void.
 * This should only be set once, before any stuff is added to the grid.
 * @param {number} color 0 or 1
 * @returns {TileGrid}
 */
TileGrid.prototype.setWallColor = function(color) {
  this.wallColor = color;
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
  let cx = this.getCellIndexAtWorld(worldX);
  let cy = this.getCellIndexAtWorld(worldY);
  let cellsPerScreenX = this.renderer.canvas.width / pixelsPerCell;
  let cellsPerScreenY = this.renderer.canvas.height / pixelsPerCell;
  let rx = Math.ceil(cellsPerScreenX);
  let ry = Math.ceil(cellsPerScreenY);
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      this.drawTileAtCellXY(cx + dx, cy + dy);
    }
  }
};

/**
 * Draws the visible tiles using the renderer.
 */
TileGrid.prototype.drawTilesOverlappingCircles = function(circles) {
  this.cellIdsToDraw.clear();
  for (let i = 0; i < circles.length; i++) {
    let circle = circles[i];
    if (!circle) continue;
    this.addCellIdsOverlappingCircle(this.cellIdsToDraw, circle);
  }
  for (let cellId of this.cellIdsToDraw.keys()) {
    this.drawTileAtCellId(cellId);
  }
};

/**
 * Finds cells overlapping the world-coord circle, and puts their cellIds into the Set
 * @param {Set} outSet The set to write to
 * @param {Circle} circle in world coords
 */
TileGrid.prototype.addCellIdsOverlappingCircle = function(outSet, circle) {
  let x0 = this.getCellIndexAtWorld(circle.pos.x - circle.rad);
  let x1 = this.getCellIndexAtWorld(circle.pos.x + circle.rad);
  let y0 = this.getCellIndexAtWorld(circle.pos.y - circle.rad);
  let y1 = this.getCellIndexAtWorld(circle.pos.y + circle.rad);
  let rectRad = this.v1.setXY(this.bitGrid.cellWorldSize/2, this.bitGrid.cellWorldSize/2);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      let cellIndex = this.bitGrid.getCellIdAtIndexXY(cx, cy);
      if (!outSet.has(cellIndex)) {
        let rectPos = this.v0.setXY((cx + 0.5) * this.bitGrid.cellWorldSize, (cy + 0.5) * this.bitGrid.cellWorldSize);
        if (OverlapDetector.isRectOverlappingCircle(rectPos, rectRad, circle.pos, circle.rad)) {
          outSet.add(this.bitGrid.getCellIdAtIndexXY(cx, cy));
        }
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
  let tile = this.tiles[cellId];
  if (!tile) {
    tile = this.loadCellId(cellId);
  }
  if (!tile.stamp) {
    tile.stamp = this.createTileStampForCellId(cellId);
  }
  if (tile.stamp && tile.stamp !== ModelStamp.EMPTY_STAMP) {
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
  let tile = this.tiles[cellId];
  return tile && tile.stamp;
};

TileGrid.prototype.startRecordingChanges = function() {
  this.bitGrid.startRecordingChanges();
};

TileGrid.prototype.stopRecordingChanges = function() {
  let changes = this.bitGrid.stopRecordingChanges();
  for (let i = 0; i < changes.length; i++) {
    let c = changes[i];
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
  this.flushNum++;
  this.world.pauseRecordingChanges();
  let changedCellIds = this.bitGrid.flushChangedCellIds();
  if (changedCellIds.length) {
    for (let i = 0; i < changedCellIds.length; i++) {
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
 * @param {number} cellId
 */
TileGrid.prototype.changeTerrain = function(cellId) {
  let center = Vec2d.alloc();
  this.bitGrid.cellIdToIndexVec(cellId, center);
  this.loadCellXY(center.x - 1, center.y);
  this.loadCellXY(center.x + 1, center.y);
  this.loadCellXY(center.x, center.y - 1);
  this.loadCellXY(center.x, center.y + 1);

  // Before unloading and reloading this, make sure it hasn't been loaded
  // already as part of this set of changes. Otherwise, this can
  // unload and reload the center tile for no reason.
  let centerTile = this.tiles[cellId];
  if (!centerTile || this.flushNum !== centerTile.flushNum) {
    this.unloadCellXY(center.x, center.y);
  }
  this.loadCellXY(center.x, center.y);
  center.free();
};

TileGrid.prototype.loadCellXY = function(cx, cy) {
  this.loadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.loadCellId = function(cellId) {
  let tile = this.tiles[cellId];
  if (!tile) {
    this.tiles[cellId] = tile = {
      cellId: cellId,
      stamp: null,
      bodyIds: null,
      flushNum: this.flushNum
    };
  }
  if (!tile.bodyIds) {
    tile.bodyIds = [];
    // Create wall bodies and remember their IDs.
    let rects = this.bitGrid.getRectsOfColorForCellId(this.wallColor, cellId);
    for (let r = 0; r < rects.length; r++) {
      let rect = rects[r];
      let body = this.createWallBody(rect);
      tile.bodyIds.push(this.world.addBody(body));
    }
  }
  return tile;
};

TileGrid.prototype.unloadCellXY = function(cx, cy) {
  this.unloadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TileGrid.prototype.unloadCellId = function(cellId) {
  let tile = this.tiles[cellId];
  if (!tile) return;
  if (tile.stamp) {
    if (tile.stamp !== ModelStamp.EMPTY_STAMP) {
      tile.stamp.dispose(this.renderer.gl);
    }
    tile.stamp = null;
  }
  if (tile.bodyIds) {
    for (let i = 0; i < tile.bodyIds.length; i++) {
      let id = tile.bodyIds[i];
      this.world.removeBodyId(id);
    }
    tile.bodyIds = null;
  }
  tile.flushNum = -1;
};

/**
 * Creates a body, but does not add it to the world.
 */
TileGrid.prototype.createWallBody = function(rect) {
  let b = Body.alloc();
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
  let tileModel = null;

  if (!this.useFans) {
    // Use minimal rects, just like the bodies
    let rects = this.bitGrid.getRectsOfColorForCellId(this.wallColor, cellId);
    if (rects.length) {
      tileModel = new RigidModel();
      for (let i = 0; i < rects.length; i++) {
        tileModel.addRigidModel(this.createWallModel(rects[i]));
      }
    }
  } else {
    // Create more rects and a lot more edge vertexes - more of a mesh.
    let fans = this.bitGrid.getFansOfColorForCellId(this.wallColor, cellId);
    if (fans.length) {
      tileModel = new RigidModel();
      for (let i = 0; i < fans.length; i++) {
        tileModel.addRigidModel(RigidModel.createFromFanVecs(fans[i]));
      }
    }
  }
  return tileModel ? tileModel.createModelStamp(this.renderer.gl) : ModelStamp.EMPTY_STAMP;
};

TileGrid.prototype.createWallModel = function(rect) {
  let transformation = this.mat44
      .toTranslateOpXYZ(rect.pos.x, rect.pos.y, 0)
      .multiply(new Matrix44().toScaleOpXYZ(rect.rad.x, rect.rad.y, 1));
  let wallModel = RigidModel.createSquare().transformPositions(transformation);
  wallModel.setColorRGB(1, 1, 1);
  return wallModel;
};

TileGrid.prototype.createFloorModelForCellXY = function(cx, cy) {
  let x = (cx + 0.5) * this.bitGrid.cellWorldSize - this.bitGrid.bitWorldSize/2;
  let y = (cy + 0.5) * this.bitGrid.cellWorldSize - this.bitGrid.bitWorldSize/2;
  let r = this.bitGrid.cellWorldSize / 2;
  this.rect.setPosXY(x, y);
  let transformation = new Matrix44()
      .toTranslateOpXYZ(x, y, 0.999)
      .multiply(new Matrix44().toScaleOpXYZ(r, r, 1));
  let wallModel = RigidModel.createSquare().transformPositions(transformation);
  // TODO: color options?
  wallModel.setColorRGB(0.25, 0.18, 0.25);
  return wallModel;
};

TileGrid.prototype.unloadAllCells = function() {
  for (let cellId in this.tiles) {
    this.unloadCellId(cellId);
  }
};