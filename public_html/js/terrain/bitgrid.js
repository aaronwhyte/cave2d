/**
 * An very big grid of pixels, optimized for memory, speed, and serialization size.
 * It has over 67 million rows and columns, each holding a 32x32 subgrid of pixels.
 * Values are 0 and 1, defaulting to 0.
 * @constructor
 */
function BitGrid(pixelSize) {
  this.bitWorldSize = pixelSize;
  this.cellWorldSize = this.bitWorldSize * BitGrid.BITS;

  // A cell can be nonexistent (value 0), or have a value of 1, or an array of 32 32-bit integers forming a
  // 32x32 pixel subgrid.
  this.cells = {};

  // A map from touched cellIds to their old values, so callers can see which were modified,
  // for immediate, interactive redrawing, and creation an destruction of world bodies.
  this.changedCells = {};

  // Map from changed cellIds to their old values, when changes are being recorded. Otherwise it's null.
  // Its scope is longer than changedCells - changeOps's scope is a undoable/redoable gesture. And it is optional,
  // since it's only important when editing, and therefore undoing, is happening.
  this.changeOpBefores = null;
}

/**
 * Quadtree compression assumes that this is a power of 2.
 * JavaScript bitwise operations only work on the first 32 bits of a number.
 * So 32 is a good number.
 * @type {number}
 */
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

BitGrid.CHANGE_TYPE = 'bg';

BitGrid.prototype.startRecordingChanges = function() {
  if (this.changeOpBefores) throw Error("BitGrid already recording changes");
  this.changeOpBefores = {};
};

BitGrid.prototype.stopRecordingChanges = function() {
  if (!this.changeOpBefores) throw Error("BitGrid was not recording changes");
  var retval = [];
  for (var cellId in this.changeOpBefores) {
    retval.push(new ChangeOp(BitGrid.CHANGE_TYPE, cellId,
        this.copyCell(this.changeOpBefores[cellId]),
        this.copyCell(this.cells[cellId]),
        null, null));
  }
  this.changeOpBefores = null;
  return retval;
};

BitGrid.prototype.copyCell = function(cell) {
  if (Array.isArray(cell)) {
    return cell.concat();
  } else {
    return cell;
  }
};

BitGrid.prototype.applyChanges = function(changeOps) {
  for (var i = 0; i < changeOps.length; i++) {
    var changeOp = changeOps[i];
    var cellId = changeOp.id;
    // Record changedCells, to support caller.flushChangedCellIds.
    this.changedCells[cellId] = this.copyCell(this.cells[cellId]);

    // Really update the cell.
    if (!changeOp.afterState) {
      delete this.cells[cellId];
    } else {
      this.cells[cellId] = this.copyCell(changeOp.afterState);
    }
  }
};

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
    // TODO: Arrays are never equal. Is this just optimization for primitive cells?
    if (this.changedCells[id] !== this.cells[id]) {
      changedIds.push(id);
    }
  }
  this.changedCells = {};
  return changedIds;
};

/**
 * Gets a minimal number of rects that cover the bits of a certain color. Horizontally adjacent bits are merged into
 * rows. Vertically adjacent rows covering the same horizontal range are merged into taller blocks.
 * These rect are new'ed, not alloc'ed, so don't free them; just let them get garbage collected.
 * @param color
 * @param cellId
 * @returns {Array}
 */
BitGrid.prototype.getRectsOfColorForCellId = function(color, cellId) {
  var brs = this.allocBitRectsOfColorForCellId(color, cellId);
  var cellWorldX = this.getCellWorldX(cellId);
  var cellWorldY = this.getCellWorldY(cellId);
  var rects = [];
  for (var i = 0; i < brs.length; i++) {
    var br = brs[i];
    rects.push(br.createWorldRect(cellWorldX, cellWorldY, this.bitWorldSize));
    br.free();
  }
  return rects;
};

/**
 * Gets a minimal number of fan that cover the bits of a certain color. Horizontally adjacent bits are merged into
 * rows. Vertically adjacent rows covering the same horizontal range are merged into taller blocks.
 * These rect are new'ed, not alloc'ed, so don't free them; just let them get garbage collected.
 * @param color
 * @param cellId
 * @returns {Array}
 */
BitGrid.prototype.getFansOfColorForCellId = function(color, cellId) {
  var brs = this.allocBitRectsOfColorForCellId(color, cellId);
  var cellWorldX = this.getCellWorldX(cellId);
  var cellWorldY = this.getCellWorldY(cellId);
  var cell = this.cells[cellId];
  var rects = [];
  for (var i = 0; i < brs.length; i++) {
    var br = brs[i];
    rects.push(br.createWorldFan(cell, color, cellWorldX, cellWorldY, this.bitWorldSize));
    br.free();
  }
  return rects;
};

// BitGrid.prototype.splitBitRectsOverRatio = function(brs, r) {
//   var loops = 0;
//   for (var i = 0; i < brs.length;) {
//     var br = brs[i];
//     var w = br.getWidth();
//     var h = br.getHeight();
//     if (w > h * r) {
//       brs.push(br.cutOffRightHalf(r));
//     } else if (h > w * r) {
//       brs.push(br.cutOffTopHalf(r));
//     } else {
//       i++;
//     }
//     if (++loops >= 2000) throw Error('uh oh');
//   }
// };
//
/**
 * Gets one freshly allocated Rect for each bit of the target color. Up to 32x32 = 1024 of them!
 * This is a bad idea. Don't use this.
 * @param color
 * @param cellId
 * @returns {Array}
 */
BitGrid.prototype.getTinyRectsOfColorForCellId = function(color, cellId) {
  var self = this;
  function createRect(bx, by) {
    var wx = cx * self.cellWorldSize + (bx) * self.bitWorldSize;
    var wy = cy * self.cellWorldSize + (by) * self.bitWorldSize;
    return new Rect(wx, wy, self.bitWorldSize/2, self.bitWorldSize/2);
  }
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  var rects = [];
  var cell = this.cells[cellId];
  var isArray = Array.isArray(cell);
  for (var by = 0; by < BitGrid.BITS; by++) {
    for (var bx = 0; bx < BitGrid.BITS; bx++) {
      if (isArray) {
        var bit = (cell[by] >> bx) & 1;
        if (bit === color) {
          rects.push(createRect(bx, by))
        }
      } else if (this.cellEqualsColor(cell, color)) {
        rects.push(createRect(bx, by))
      }
    }
  }
  return rects;
};

/**
 * Gets a minimal number of BitRects that cover the bits of a certain color. Horizontally adjacent bits are merged into
 * rows. Vertically adjacent rows covering the same horizontal range are merged into taller blocks.
 * These rects *are* alloced, so be sure to free() them!
 * @param color
 * @param cellId
 * @returns {Array.<BitRect>} array of BitRects, of course.
 */
BitGrid.prototype.allocBitRectsOfColorForCellId = function(color, cellId) {
  var bx, by;
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  var bitRects = [];
  var cell = this.cells[cellId];
  if (this.cellEqualsColor(cell, color)) {
    bitRects.push(BitRect.alloc(0, 0, BitGrid.BITS - 1, BitGrid.BITS - 1));
  } else if (Array.isArray(cell)) {

    // key: starting X bit position. Value: {startY, endX}
    var oldRects = {};
    for (by = 0; by < BitGrid.BITS; by++) {
      var newRects = {};
      var runStartX = -1;
      // Record newRects in this row.
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        var bit = (cell[by] >> bx) & 1;
        if (bit === color) {
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
      var isLastRow = by === BitGrid.BITS - 1;
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        var oldRect = oldRects[bx];
        var newRect = newRects[bx];
        // Harvest unmatched old ones.
        if (oldRect && newRect && oldRect.endX === newRect.endX) {
          // This is a merge, unless we're on the last row, in which case we harvest.
          if (isLastRow) {
            // last row harvest
            bitRects.push(BitRect.alloc(bx, oldRect.startY, oldRect.endX, by));
          }
        } else {
          // old and new are not equal start/end (or maybe not existent)
          if (oldRect) {
            // harvest and delete
            bitRects.push(BitRect.alloc(bx, oldRect.startY, oldRect.endX, by - 1));
            delete oldRects[bx];
          }
          if (newRect) {
            if (isLastRow) {
              // make rect on this row
              bitRects.push(BitRect.alloc(bx, newRect.startY, newRect.endX, by));
            } else {
              // graduate
              oldRects[bx] = newRects[bx];
            }
          }
        }
      }
    }
  }
  return bitRects;
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

/**
 * @param cellId
 * @returns {number} the world position of the left edge (?) of the cell.
 */
BitGrid.prototype.getCellWorldX = function(cellId) {
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  var cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  return this.cellWorldSize * cx;
};

/**
 * @param cellId
 * @returns {number} the world position of the top edge (?) of the cell.
 */
BitGrid.prototype.getCellWorldY = function(cellId) {
  var cy = Math.floor(cellId / BitGrid.COLUMNS);
  return this.cellWorldSize * cy;
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
  var zeroRows = 0;
  var oneRows = 0;
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
    if (newRowVal == 0) {
      zeroRows++;
    } else if (newRowVal == BitGrid.ROW_OF_ONES) {
      oneRows++;
    }

    if (newRowVal != oldRowVal) {
      // If it was clean to start with, then preserve the clean value in changedCells.
      if (clean) {
        var originalVal = Array.isArray(cell) ? cell.concat() : cell;
        this.changedCells[cellId] = originalVal;
        if (this.changeOpBefores && !(cellId in this.changeOpBefores)) {
          this.changeOpBefores[cellId] = originalVal;
        }
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
  if (zeroRows == BitGrid.BITS) {
    this.deleteCellAtIndexXY(cx, cy);
  } else if (oneRows == BitGrid.BITS) {
    this.setCellAtIndexXY(cx, cy, 1);
  }
  pixelCenter.free();
};

BitGrid.prototype.drawPillOnCellIndexXY = function(seg, rad, color, cx, cy) {
  var pixelCenter = Vec2d.alloc();
  var cell = this.getCellAtIndexXY(cx, cy);

  var cellId = this.getCellIdAtIndexXY(cx, cy);
  var clean = !(cellId in this.changedCells);

  var radSquared = rad * rad;
  var isArray = Array.isArray(cell);
  var startingColor = isArray ? 0.5 : (cell ? 1 : 0);
  var zeroRows = 0;
  var oneRows = 0;
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
    if (newRowVal == 0) {
      zeroRows++;
    } else if (newRowVal == BitGrid.ROW_OF_ONES) {
      oneRows++;
    }

    if (newRowVal != oldRowVal) {
      // If it was clean to start with, then preserve the clean value in changedCells.
      if (clean) {
        this.changedCells[cellId] = this.copyCell(cell);
        if (this.changeOpBefores && !(cellId in this.changeOpBefores)) {
          this.changeOpBefores[cellId] = this.copyCell(cell);
        }
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
  if (zeroRows == BitGrid.BITS) {
    this.deleteCellAtIndexXY(cx, cy);
  } else if (oneRows == BitGrid.BITS) {
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

BitGrid.SOLID = 1;
BitGrid.DETAILED = 0;

/**
 * The "cells" field is an object where
 * each key is a cellId in base 32,
 * and each value is a base64-encoded BitQueue quadtree representation of the cell.
 * @returns {{bitWorldSize: *, cells: {}}}
 */
BitGrid.prototype.toJSON = function() {
  function enqueueQuad(startX, startY, size) {
    var startColor = (cell[startY] & (1 << startX)) ? 1 : 0;
    if (size == 1) {
      bitQueue.enqueueNumber(startColor, 1);
      return;
    }
    for (var by = startY; by < startY + size; by++) {
      for (var bx = startX; bx < startX + size; bx++) {
        var pixel = (cell[by] & (1 << bx)) ? 1 : 0;
        if (pixel != startColor) {
          // non-uniform square. Lets get quadruple recursive!
          bitQueue.enqueueNumber(BitGrid.DETAILED, 1);
          var half = size/2;
          enqueueQuad(startX, startY, half);
          enqueueQuad(startX + half, startY, half);
          enqueueQuad(startX, startY + half, half);
          enqueueQuad(startX + half, startY + half, half);
          return;
        }
      }
    }
    // uniform square
    bitQueue.enqueueNumber(BitGrid.SOLID, 1);
    bitQueue.enqueueNumber(startColor, 1);
  }

  var json = {
    bitWorldSize: this.bitWorldSize,
    cells:{}
  };
  for (var cellId in this.cells) {
    var cell = this.cells[cellId];
    var bitQueue = new BitQueue();
    if (Array.isArray(cell)) {
      enqueueQuad(0, 0, BitGrid.BITS);
    } else {
      // Uniform cell
      bitQueue.enqueueNumber(BitGrid.SOLID, 1);
      bitQueue.enqueueNumber(cell, 1);
    }
    json.cells[Number(cellId).toString(32)] = btoa(bitQueue.dequeueToBytesAndPadZerosRight());
  }
  return json;
};

BitGrid.fromJSON = function(json) {
  function plot(x, y, c) {
    if (c) {
      cell[y] |= 1 << x;
    } else {
      cell[y] &= BitGrid.ROW_OF_ONES ^ (1 << x);
    }
  }

  function dequeueQuad(startX, startY, size) {
    var color;
    if (size == 1) {
      color = bitQueue.dequeueNumber(1);
      plot(startX, startY, color);
      return;
    }
    var kind = bitQueue.dequeueNumber(1);
    if (kind == BitGrid.SOLID) {
      color = bitQueue.dequeueNumber(1);
      for (var by = startY; by < startY + size; by++) {
        for (var bx = startX; bx < startX + size; bx++) {
          plot(bx, by, color);
        }
      }
    } else {
      // DETAILED
      var half = size/2;
      dequeueQuad(startX, startY, half);
      dequeueQuad(startX + half, startY, half);
      dequeueQuad(startX, startY + half, half);
      dequeueQuad(startX + half, startY + half, half);
    }
  }

  var bitGrid = new BitGrid(json.bitWorldSize);
  for (var cellId32 in json.cells) {
    var cellId = parseInt(cellId32, 32);
    var cellBytes = atob(json.cells[cellId32]);
    var bitQueue = new BitQueue();
    bitQueue.enqueueBytes(cellBytes);
    var cell = bitGrid.createCellArray(0);
    dequeueQuad(0, 0, 32);
    bitGrid.cells[cellId] = cell;

    // Mark this cell as dirty. Its old value was 0, the default full-empty value.
    bitGrid.changedCells[cellId] = 0;
  }
  return bitGrid;
};