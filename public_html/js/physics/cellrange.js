/**
 * A rectangular range of cells in a grid.
 * @constructor
 */
function CellRange() {
  this.reset();
}

CellRange.prototype.reset = function() {
  this.x0 = 0;
  this.y0 = 0;
  this.x1 = -1;
  this.y1 = -1;
};

/**
 * @param {CellRange} that
 */
CellRange.prototype.set = function(that) {
  this.x0 = that.x0;
  this.y0 = that.y0;
  this.x1 = that.x1;
  this.y1 = that.y1;
};

Poolify(CellRange);
