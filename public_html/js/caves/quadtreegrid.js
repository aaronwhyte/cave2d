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
}

/**
 * Paint an area of the quadtreegrid.
 */
QuadTreeGrid.prototype.paint = function(painter) {
  var rect = new Rect();
  painter.getBoundingRect(rect);
  var cellX0 = this.getCellIndexX(rect.getMinX());
  var cellY0 = this.getCellIndexY(rect.getMinY());
  var cellX1 = this.getCellIndexX(rect.getMaxX());
  var cellY1 = this.getCellIndexY(rect.getMaxY());
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
 * @param {Rect} rect
 * @param opt_squares
 * @returns {*|Array}
 */
QuadTreeGrid.prototype.getSquaresOverlappingRect = function(rect, opt_squares) {
  var squares = opt_squares || [];
  for (var colNum in this.grid) {
    var col = this.grid[colNum];
    for (var rowNum in col) {
      col[rowNum].getSquaresOverlappingRect(rect, squares);
    }
  }
  return squares;
};

QuadTreeGrid.prototype.getTopGridSquares = function(opt_squares) {
  var squares = opt_squares || [];
  for (var colNum in this.grid) {
    var col = this.grid[colNum];
    for (var rowNum in col) {
      squares.push([this.getWorldXForIndexX(colNum), this.getWorldYForIndexY(rowNum),
          this.radius, this.radius]);
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

QuadTreeGrid.prototype.toJSON = function() {
  var gridJson = {};
  for (var colNum in this.grid) {
    gridJson[colNum] = {};
    var col = this.grid[colNum];
    for (var rowNum in col) {
      gridJson[colNum][rowNum] = col[rowNum].toJSON();
    }
  }

  return {
    radius: this.radius,
    maxDepth: this.maxDepth,
    grid: gridJson
  };
};

QuadTreeGrid.fromJSON = function(json) {
  var quadTreeGrid = new QuadTreeGrid(json.radius, json.maxDepth);
  for (var colNum in json.grid) {
    quadTreeGrid.grid[colNum] = {};
    var jsonCol = json.grid[colNum];
    for (var rowNum in jsonCol) {
      quadTreeGrid.grid[colNum][rowNum] = QuadTree.fromJSON(jsonCol[rowNum]);
    }
  }
  return quadTreeGrid;
};