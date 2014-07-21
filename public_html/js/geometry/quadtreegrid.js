/**
 * An infinite grid of square quadtrees in world coordinates.
 * Values are numeric, and by default the whole plane is set to 0.
 * @param {number} radius This is half the height and half the width of each quadtree
 * @param {number} maxDepth Must be at least 1, meaning each tree is just four squares.
 * @constructor
 */
function QuadTreeGrid(radius, maxDepth) {
  this.radius = radius;
  this.maxDepth = maxDepth;
  // The grid is a hash of column number (x) to columns,
  // and a column is a hash from row (y) to a quadtree.
  this.grid = {};
  this.rect = [0, 0, 0, 0];
}

/**
 * Paint an area of the quadtreegrid.
 */
QuadTreeGrid.prototype.paint = function(painter) {
  painter.getBoundingRect(this.rect);
  var areaX = this.rect[0];
  var areaY = this.rect[1];
  var areaXR = this.rect[2];
  var areaYR = this.rect[3];
  var cellX0 = this.getCellIndexX(areaX - areaXR);
  var cellY0 = this.getCellIndexY(areaY - areaYR);
  var cellX1 = this.getCellIndexX(areaX + areaXR);
  var cellY1 = this.getCellIndexY(areaY + areaYR);
  for (var cellX = cellX0; cellX <= cellX1; cellX++) {
    for (var cellY = cellY0; cellY <= cellY1; cellY++) {
      var worldX = this.getWorldXForIndexX(cellX);
      var worldY = this.getWorldYForIndexY(cellY);
      if (painter.getEffect(worldX, worldY, this.radius, false, null) != Painter.PAINT_NOTHING) {
        var col = this.grid[cellX];
        if (!col) {
          col = this.grid[cellX] = {};
        }
        var cell = col[cellY];
        if (!cell) {
          cell = col[cellY] = new QuadTree(worldX, worldY, this.radius, this.maxDepth);
        }
        cell.paint(painter);
//        var covered = cell.paint(painter);
//        if (covered && !color) {
//          // Delete this grid cell
//          delete col[cellY];
//        }
      }
    }
  }
};
/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 */
QuadTreeGrid.prototype.getAllColoredSquares = function() {
  var squares = [];
  for (var colNum in this.grid) {
    var col = this.grid[colNum];
    for (var rowNum in col) {
      col[rowNum].getAllColoredSquares(squares);
    }
  }
  return squares;
};

/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 */
QuadTreeGrid.prototype.getSquaresOfColor = function(color, opt_squares) {
  var squares = opt_squares || [];
  for (var colNum in this.grid) {
    var col = this.grid[colNum];
    for (var rowNum in col) {
      col[rowNum].getSquaresOfColor(color, squares);
    }
  }
  return squares;
};

/**
 * @returns {Number} the grid cell X index that corresponds with the x value.
 */
QuadTreeGrid.prototype.getCellIndexX = function(x) {
  return Math.round(x / (this.radius * 2));
};

/**
 * @return {Number} the grid cell Y index that corresponds with the y value.
 */
QuadTreeGrid.prototype.getCellIndexY = function(y) {
  return Math.round(y / (this.radius * 2));
};

/**
 * @return {Number}
 */
QuadTreeGrid.prototype.getWorldXForIndexX = function(ix) {
  return this.radius * 2 * ix;
};

/**
 * @return {Number}
 */
QuadTreeGrid.prototype.getWorldYForIndexY = function(iy) {
  return this.radius * 2 * iy;
};

