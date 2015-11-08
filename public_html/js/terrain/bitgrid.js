/**
 * An very big grid of pixels, optimized for memory, speed, and serialization size.
 * It has over 67 million rows and columns, each holding a 16x16 subgrid of pixels.
 * Values are 0 and 1, defaulting to 0.
 * @constructor
 */
function BitGrid(pixelSize) {
  this.bitWorldSize = pixelSize;
  this.cellWorldSize = this.bitWorldSize * BitGrid.BITS;

  // A cell can be nonexistent (value 0), or have a value of 1, or an array of 16 16-bit integers forming a
  // 16x16 pixel subgrid.
  this.cells = {};

  // A map from touched cellIds to their old values, so callers can see which were modified.
  this.changedCells = {};
}
BitGrid.BITS = 32;

// It's got over 67 million columns.
BitGrid.COLUMNS = 0x4000000;

BitGrid.ROW_OF_ONES = (function() {
  var row = 0;
  for (var i = 0; i < BitGrid.BITS; i++) {
    row |= (1 << i);
  }
  return row;
})();

BitGrid.prototype.cellIdToIndexVec = function(cellId, out) {
  if (!out) out = new Vec2d();
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  out.setXY(cx, cy);
  return out;
};

BitGrid.prototype.flushChangedCellIds = function() {
  var changedIds = [];
  for (var id in this.changedCells) {
    if (this.changedCells[id] != this.cells[id]) {
      changedIds.push(id);
    }
  }
  this.changedCells = {};
  return changedIds;
};

BitGrid.prototype.getRectsOfColorForCellId = function(color, cellId) {
  var bx, by;
  var self = this;
  function createRect(bx0, by0, bx1, by1) {
    var wx0 = cx * self.cellWorldSize + (bx0 - 0.5) * self.bitWorldSize;
    var wy0 = cy * self.cellWorldSize + (by0 - 0.5) * self.bitWorldSize;
    var wx1 = cx * self.cellWorldSize + (bx1 + 0.5) * self.bitWorldSize;
    var wy1 = cy * self.cellWorldSize + (by1 + 0.5) * self.bitWorldSize;
    return new Rect(
        (wx0 + wx1)/2, (wy0 + wy1)/2, (wx1 - wx0)/2, (wy1 - wy0)/2);
  }

  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  var rects = [];
  var cell = this.cells[cellId];
  if (this.cellEqualsColor(cell, color)) {
    rects.push(new Rect(
        (cx + 0.5) * this.cellWorldSize - this.bitWorldSize/2,
        (cy + 0.5) * this.cellWorldSize - this.bitWorldSize/2,
        this.cellWorldSize / 2,
        this.cellWorldSize / 2));
  } else if (Array.isArray(cell)) {

    var oldRects = {};
    for (by = 0; by < BitGrid.BITS; by++) {
      var newRects = {};
      var runStartX = -1;
      // Record newRects in this row.
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        var bit = (cell[by] >> bx) & 1;
        if (bit == color) {
          // Color match.
          if (runStartX < 0) {
            // First bit on the row.
            runStartX = bx;
            newRects[runStartX] = {startY: by, endX: bx};
          } else {
            // Continue run
            newRects[runStartX].endX = bx;
          }
        } else {
          // Not a color match.
          runStartX = -1;
        }
      }
      var isLastRow = by == BitGrid.BITS - 1;
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        var oldRect = oldRects[bx];
        var newRect = newRects[bx];
        // Harvest unmatched old ones.
        if (oldRect && newRect && oldRect.endX == newRect.endX) {
          // This is a merge, unless we're on the last row, in which case we harvest.
          if (isLastRow) {
            // last row harvest
            rects.push(createRect(bx, oldRect.startY, oldRect.endX, by));
          }
        } else {
          // old and new are not equal start/end (or maybe not existent)
          if (oldRect) {
            // harvest and delete
            rects.push(createRect(bx, oldRect.startY, oldRect.endX, by - 1));
            delete oldRects[bx];
          }
          if (newRect) {
            if (isLastRow) {
              // make rect on this row
              rects.push(createRect(bx, newRect.startY, newRect.endX, by));
            } else {
              // graduate
              oldRects[bx] = newRects[bx];
            }
          }
        }
      }
    }
  }
  return rects;
};

/**
 * @returns {Number} the grid cell X index that corresponds with world coord X.
 */
BitGrid.prototype.getCellIndexX = function(x) {
  return Math.floor(x / this.cellWorldSize);
};

/**
 * @return {Number} the grid cell Y index that corresponds with world coord Y.
 */
BitGrid.prototype.getCellIndexY = function(y) {
  return Math.floor(y / this.cellWorldSize);
};

BitGrid.prototype.getCellIdAtIndexXY = function(cx, cy) {
  return BitGrid.COLUMNS * cy + cx + BitGrid.COLUMNS/2;
};

BitGrid.prototype.getCellAtIndexXY = function(cx, cy) {
  return this.cells[this.getCellIdAtIndexXY(cx, cy)];
};

BitGrid.prototype.setCellAtIndexXY = function(cx, cy, cell) {
  this.cells[this.getCellIdAtIndexXY(cx, cy)] = cell;
};

BitGrid.prototype.deleteCellAtIndexXY = function(cx, cy) {
  delete this.cells[this.getCellIdAtIndexXY(cx, cy)];
};

BitGrid.prototype.cellEqualsColor = function(cell, color) {
  return !Array.isArray(cell) && ((color == 0 && !cell) || (color == 1 && cell === 1));
};

BitGrid.prototype.drawPill = function(seg, rad, color) {
  // bounding rect
  var rect = seg.getBoundingRect(this.rect).pad(rad);
  var cx0 = this.getCellIndexX(rect.getMinX());
  var cy0 = this.getCellIndexY(rect.getMinY());
  var cx1 = this.getCellIndexX(rect.getMaxX());
  var cy1 = this.getCellIndexY(rect.getMaxY());
  for (var cx = cx0; cx <= cx1; cx++) {
    for (var cy = cy0; cy <= cy1; cy++) {
      var cell = this.getCellAtIndexXY(cx, cy);
      if (!this.cellEqualsColor(cell, color)) {
        this.drawPillOnCellIndexXY(seg, rad, color, cx, cy);
      }
    }
  }
};

BitGrid.prototype.drawPillOnCellIndexXY = function(seg, rad, color, cx, cy) {
  var pixelCenter = Vec2d.alloc();
  var cell = this.getCellAtIndexXY(cx, cy);

  var cellId = this.getCellIdAtIndexXY(cx, cy);
  var clean = !(cellId in this.changedCells);

  var radSquared = rad * rad;
  var isArray = Array.isArray(cell);
  var startingColor = isArray ? 0.5 : (cell ? 1 : 0);
  var sumOfRows = 0;
  for (var by = 0; by < BitGrid.BITS; by++) {
    var oldRowVal = isArray ? cell[by] : (startingColor ? BitGrid.ROW_OF_ONES : 0);
    var newRowVal = oldRowVal;
    pixelCenter.y = cy * this.cellWorldSize + by * this.bitWorldSize;
    for (var bx = 0; bx < BitGrid.BITS; bx++) {
      pixelCenter.x = cx * this.cellWorldSize + bx * this.bitWorldSize;
      if (seg.distanceToPointSquared(pixelCenter) <= radSquared) {
        newRowVal = color
            ? (newRowVal | (1 << bx))
            : (newRowVal & (BitGrid.ROW_OF_ONES ^ (1 << bx)));
      }
    }
    sumOfRows += newRowVal;
    if (newRowVal != oldRowVal) {
      // If it was clean to start with, then preserve the clean value in changedCells.
      if (clean) {
        this.changedCells[cellId] = Array.isArray(cell) ? cell.concat() : cell;
        clean = false;
      }
      // If it wasn't an array already, make it one now so we can adjust this row.
      if (!isArray) {
        cell = this.createCellArray(startingColor);
        this.setCellAtIndexXY(cx, cy, cell);
        isArray = true;
      }
      cell[by] = newRowVal;
    }
  }

  // Simplify the grid?
  if (sumOfRows == 0) {
    this.deleteCellAtIndexXY(cx, cy);
  } else if (sumOfRows == BitGrid.ROW_OF_ONES * BitGrid.BITS) {
    this.setCellAtIndexXY(cx, cy, 1);
  }
  pixelCenter.free();
};

BitGrid.prototype.createCellArray = function(color) {
  var cell = new Array(BitGrid.BITS);
  var rowVal = color ? BitGrid.ROW_OF_ONES : 0;
  for (var i = 0; i < BitGrid.BITS; i++) {
    cell[i] = rowVal;
  }
  return cell;
};

BitGrid.prototype.toJSON = function() {
  return {
    bitWorldSize: this.bitWorldSize,
    cells: this.cells
  };
};

BitGrid.fromJSON = function(json) {
  var bitGrid = new BitGrid(json.bitWorldSize);
  bitGrid.cells = json.cells;
  return bitGrid;
};