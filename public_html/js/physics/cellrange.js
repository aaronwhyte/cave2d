/**
 * @param x0
 * @param y0
 * @param x1
 * @param y1
 * @constructor
 */
function CellRange(x0, y0, x1, y1) {
  this.reset(x0, y0, x1, y1);
}

CellRange.prototype.reset = function(x0, y0, x1, y1) {
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
};

Poolify(CellRange);