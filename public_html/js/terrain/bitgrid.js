/**
 * An very big grid of pixels, optimized for memory, speed, and serialization size.
 * It has over 67 million rows and columns, each cell holding a 32x32 subgrid of pixels.
 * Values are 0 and 1, defaulting to 0.
 * <p>
 * The cell at cell coords 0,0 is in the +x +y quadrant, and includes pixels with x=0 and y=0, and positive values,
 * but no negative values.
 * <p>
 * Pixels are organized by their centers, and the pixel at 0,0 has it's center there, though its body
 * extends into all four cartesian quadrants.
 * <p>
 * Pill-drawing will color a pixel if the drawing segment overlaps the <b>center</b> of the pixel. So it is possible
 * for a long skinny segment to not color any pixels, or to color a non-contiguous set of pixels.
 *
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
  let row = 0;
  for (let i = 0; i < BitGrid.BITS; i++) {
    row |= (1 << i);
  }
  return row;
})();

// In detailed cells, fan rects will never be wider/taller than this.
BitGrid.MAX_FAN_RECT_BITS = 4;

BitGrid.CHANGE_TYPE = 'bg';

BitGrid.prototype.startRecordingChanges = function() {
  if (this.changeOpBefores) throw Error("BitGrid already recording changes");
  this.changeOpBefores = {};
};

BitGrid.prototype.stopRecordingChanges = function() {
  if (!this.changeOpBefores) throw Error("BitGrid was not recording changes");
  let retval = [];
  for (let cellId in this.changeOpBefores) {
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
  for (let i = 0; i < changeOps.length; i++) {
    let changeOp = changeOps[i];
    let cellId = changeOp.id;
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
  let cy = Math.floor(cellId / BitGrid.COLUMNS);
  let cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  out.setXY(cx, cy);
  return out;
};

BitGrid.prototype.flushChangedCellIds = function() {
  let changedIds = [];
  for (let id in this.changedCells) {
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
  let brs = this.allocBitRectsOfColorForCellId(color, cellId);
  let cellWorldX = this.getCellWorldX(cellId);
  let cellWorldY = this.getCellWorldY(cellId);
  let rects = [];
  for (let i = 0; i < brs.length; i++) {
    let br = brs[i];
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
  let cell = this.cells[cellId];
  let brs = this.allocBitRectsOfColorForCellId(color, cellId);
  if (Array.isArray(cell)) {
    // Detailed cell.
    // Subdivide the inside, to avoid long midpoint-to-corner triangle edges.
    // Make the slices at regular x/y values, so the corner vertexes line up.
    this.splitEveryNBits(brs, BitGrid.MAX_FAN_RECT_BITS);
  }
  let cellWorldX = this.getCellWorldX(cellId);
  let cellWorldY = this.getCellWorldY(cellId);
  let rects = [];
  for (let i = 0; i < brs.length; i++) {
    let br = brs[i];
    rects.push(br.createWorldFan(cell, color, cellWorldX, cellWorldY, this.bitWorldSize));
    br.free();
  }
  return rects;
};

/**
 * @param {Array.<BitRect>} brs
 * @param n
 */
BitGrid.prototype.splitEveryNBits = function(brs, n) {
  let loops = 0;
  for (let i = 0; i < brs.length;) {
    let br = brs[i];
    if (Math.floor(br.x0 / n) !== Math.floor(br.x1 / n)) {
      let newX0 = br.x0 - (br.x0 % n) + n;
      brs.push(BitRect.alloc(newX0, br.y0, br.x1, br.y1));
      br.x1 = newX0 - 1;
    } else if (Math.floor(br.y0 / n) !== Math.floor(br.y1 / n)) {
      let newY0 = br.y0 - (br.y0 % n) + n;
      brs.push(BitRect.alloc(br.x0, newY0, br.x1, br.y1));
      br.y1 = newY0 - 1;
    } else {
      i++;
    }
    if (++loops >= 2000) throw Error('uh oh');
  }
};

/**
 * Gets one freshly allocated Rect for each bit of the target color. Up to 32x32 = 1024 of them!
 * This is a bad idea. Don't use this.
 * @param color
 * @param cellId
 * @returns {Array}
 */
BitGrid.prototype.getTinyRectsOfColorForCellId = function(color, cellId) {
  let self = this;
  function createRect(bx, by) {
    let wx = cx * self.cellWorldSize + (bx) * self.bitWorldSize;
    let wy = cy * self.cellWorldSize + (by) * self.bitWorldSize;
    return new Rect(wx, wy, self.bitWorldSize/2, self.bitWorldSize/2);
  }
  let cy = Math.floor(cellId / BitGrid.COLUMNS);
  let cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  let rects = [];
  let cell = this.cells[cellId];
  let isArray = Array.isArray(cell);
  for (let by = 0; by < BitGrid.BITS; by++) {
    for (let bx = 0; bx < BitGrid.BITS; bx++) {
      if (isArray) {
        let bit = (cell[by] >> bx) & 1;
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
  let bx, by;
  let bitRects = [];
  let cell = this.cells[cellId];
  if (this.cellEqualsColor(cell, color)) {
    bitRects.push(BitRect.alloc(0, 0, BitGrid.BITS - 1, BitGrid.BITS - 1));
  } else if (Array.isArray(cell)) {

    // key: starting X bit position. Value: {startY, endX}
    let oldRects = {};
    for (by = 0; by < BitGrid.BITS; by++) {
      let newRects = {};
      let runStartX = -1;
      // Record newRects in this row.
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        let bit = (cell[by] >> bx) & 1;
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
      let isLastRow = by === BitGrid.BITS - 1;
      for (bx = 0; bx < BitGrid.BITS; bx++) {
        let oldRect = oldRects[bx];
        let newRect = newRects[bx];
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
 * Gets the value of the bit at integer cordinates x, y. These aren't world coords.
 * @param {number} x
 * @param {number} y
 * @returns {number} 0 or 1
 */
BitGrid.prototype.getPixelXY = function(x, y) {
  // cx and cy are the cell's index in the grid of cells
  let cx = Math.floor(x / BitGrid.BITS);
  let cy = Math.floor(y / BitGrid.BITS);
  let cell = this.getCellAtIndexXY(cx, cy);
  if (Array.isArray(cell)) {
    // This is a detailed cell.
    // bx and by are the bit column and row within the cell
    let bx = x - cx * BitGrid.BITS;
    let by = y - cy * BitGrid.BITS;
    let row = cell[by];
    return (row & (1 << bx)) ? 1 : 0;
  }
  // This is a solid cell (1), or it's unset and undefined (0).
  return cell === 1 ? 1 : 0;
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
  return !Array.isArray(cell) && ((color === 0 && !cell) || (color === 1 && cell === 1));
};

/**
 * @param cellId
 * @returns {number} the world position of the left edge (?) of the cell.
 */
BitGrid.prototype.getCellWorldX = function(cellId) {
  let cy = Math.floor(cellId / BitGrid.COLUMNS);
  let cx = cellId - cy * BitGrid.COLUMNS - BitGrid.COLUMNS / 2;
  return this.cellWorldSize * cx;
};

/**
 * @param cellId
 * @returns {number} the world position of the top edge (?) of the cell.
 */
BitGrid.prototype.getCellWorldY = function(cellId) {
  let cy = Math.floor(cellId / BitGrid.COLUMNS);
  return this.cellWorldSize * cy;
};

/**
 * Draws a color in the grid using a pill-shape specified in world coordinates.
 * A pixel will be colored only if the drawing segment overlaps the <b>center</b> of the pixel.
 * It is possible for a long skinny segment to not color any pixels, or to color a non-contiguous set of pixels.
 *
 * @param {Segment} seg  The center-line of the pill shape
 * @param {number} rad  The distance from the segment that the pill covers
 * @param {number} color  The color to use, either 0 or 1
 */
BitGrid.prototype.drawPill = function(seg, rad, color) {
  // bounding rect
  let rect = seg.getBoundingRect(this.rect).pad(rad);
  let cx0 = this.getCellIndexX(rect.getMinX());
  let cy0 = this.getCellIndexY(rect.getMinY());
  let cx1 = this.getCellIndexX(rect.getMaxX());
  let cy1 = this.getCellIndexY(rect.getMaxY());
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      let cell = this.getCellAtIndexXY(cx, cy);
      if (!this.cellEqualsColor(cell, color)) {
        this.drawPillOnCellIndexXY(seg, rad, color, cx, cy);
      }
    }
  }
};

BitGrid.prototype.drawPillOnCellIndexXY = function(seg, rad, color, cx, cy) {
  let pixelCenter = Vec2d.alloc();
  let cell = this.getCellAtIndexXY(cx, cy);

  let cellId = this.getCellIdAtIndexXY(cx, cy);
  let clean = !(cellId in this.changedCells);

  let radSquared = rad * rad;
  let isArray = Array.isArray(cell);
  let startingColor = isArray ? 0.5 : (cell ? 1 : 0);
  let zeroRows = 0;
  let oneRows = 0;
  for (let by = 0; by < BitGrid.BITS; by++) {
    let oldRowVal = isArray ? cell[by] : (startingColor ? BitGrid.ROW_OF_ONES : 0);
    let newRowVal = oldRowVal;
    pixelCenter.y = cy * this.cellWorldSize + by * this.bitWorldSize;
    for (let bx = 0; bx < BitGrid.BITS; bx++) {
      pixelCenter.x = cx * this.cellWorldSize + bx * this.bitWorldSize;
      if (seg.distanceToPointSquared(pixelCenter) <= radSquared) {
        newRowVal = color
            ? (newRowVal | (1 << bx))
            : (newRowVal & (BitGrid.ROW_OF_ONES ^ (1 << bx)));
      }
    }
    if (newRowVal === 0) {
      zeroRows++;
    } else if (newRowVal === BitGrid.ROW_OF_ONES) {
      oneRows++;
    }

    if (newRowVal !== oldRowVal) {
      // If it was clean to start with, then preserve the clean value in changedCells.
      if (clean) {
        let originalVal = Array.isArray(cell) ? cell.concat() : cell;
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
  if (zeroRows === BitGrid.BITS) {
    this.deleteCellAtIndexXY(cx, cy);
  } else if (oneRows === BitGrid.BITS) {
    this.setCellAtIndexXY(cx, cy, 1);
  }
  pixelCenter.free();
};

BitGrid.prototype.drawPillOnCellIndexXY = function(seg, rad, color, cx, cy) {
  let pixelCenter = Vec2d.alloc();
  let cell = this.getCellAtIndexXY(cx, cy);

  let cellId = this.getCellIdAtIndexXY(cx, cy);
  let clean = !(cellId in this.changedCells);

  let radSquared = rad * rad;
  let isArray = Array.isArray(cell);
  let startingColor = isArray ? 0.5 : (cell ? 1 : 0);
  let zeroRows = 0;
  let oneRows = 0;
  for (let by = 0; by < BitGrid.BITS; by++) {
    let oldRowVal = isArray ? cell[by] : (startingColor ? BitGrid.ROW_OF_ONES : 0);
    let newRowVal = oldRowVal;
    pixelCenter.y = cy * this.cellWorldSize + by * this.bitWorldSize;
    for (let bx = 0; bx < BitGrid.BITS; bx++) {
      pixelCenter.x = cx * this.cellWorldSize + bx * this.bitWorldSize;
      if (seg.distanceToPointSquared(pixelCenter) <= radSquared) {
        newRowVal = color
            ? (newRowVal | (1 << bx))
            : (newRowVal & (BitGrid.ROW_OF_ONES ^ (1 << bx)));
      }
    }
    if (newRowVal === 0) {
      zeroRows++;
    } else if (newRowVal === BitGrid.ROW_OF_ONES) {
      oneRows++;
    }

    if (newRowVal !== oldRowVal) {
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
  if (zeroRows === BitGrid.BITS) {
    this.deleteCellAtIndexXY(cx, cy);
  } else if (oneRows === BitGrid.BITS) {
    this.setCellAtIndexXY(cx, cy, 1);
  }
  pixelCenter.free();
};

BitGrid.prototype.createCellArray = function(color) {
  let cell = new Array(BitGrid.BITS);
  let rowVal = color ? BitGrid.ROW_OF_ONES : 0;
  for (let i = 0; i < BitGrid.BITS; i++) {
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
  let cell, bitQueue;

  function enqueueQuad(startX, startY, size) {
    let startColor = (cell[startY] & (1 << startX)) ? 1 : 0;
    if (size === 1) {
      bitQueue.enqueueNumber(startColor, 1);
      return;
    }
    for (let by = startY; by < startY + size; by++) {
      for (let bx = startX; bx < startX + size; bx++) {
        let pixel = (cell[by] & (1 << bx)) ? 1 : 0;
        if (pixel !== startColor) {
          // non-uniform square. Lets get quadruple recursive!
          bitQueue.enqueueNumber(BitGrid.DETAILED, 1);
          let half = size/2;
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

  let json = {
    bitWorldSize: this.bitWorldSize,
    cells:{}
  };
  for (let cellId in this.cells) {
    cell = this.cells[cellId];
    bitQueue = new BitQueue();
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
  let cell, bitQueue;
  function plot(x, y, c) {
    if (c) {
      cell[y] |= 1 << x;
    } else {
      cell[y] &= BitGrid.ROW_OF_ONES ^ (1 << x);
    }
  }

  function dequeueQuad(startX, startY, size) {
    let color;
    if (size === 1) {
      color = bitQueue.dequeueNumber(1);
      plot(startX, startY, color);
      return;
    }
    let kind = bitQueue.dequeueNumber(1);
    if (kind === BitGrid.SOLID) {
      color = bitQueue.dequeueNumber(1);
      for (let by = startY; by < startY + size; by++) {
        for (let bx = startX; bx < startX + size; bx++) {
          plot(bx, by, color);
        }
      }
    } else {
      // DETAILED
      let half = size/2;
      dequeueQuad(startX, startY, half);
      dequeueQuad(startX + half, startY, half);
      dequeueQuad(startX, startY + half, half);
      dequeueQuad(startX + half, startY + half, half);
    }
  }

  let bitGrid = new BitGrid(json.bitWorldSize);
  for (let cellId32 in json.cells) {
    let cellId = parseInt(cellId32, 32);
    let cellBytes = atob(json.cells[cellId32]);
    bitQueue = new BitQueue();
    bitQueue.enqueueBytes(cellBytes);
    cell = bitGrid.createCellArray(0);
    dequeueQuad(0, 0, 32);
    bitGrid.cells[cellId] = cell;

    // Mark this cell as dirty. Its old value was 0, the default full-empty value.
    bitGrid.changedCells[cellId] = 0;
  }
  return bitGrid;
};