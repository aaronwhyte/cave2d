/**
 * A rectangular range of cells in a grid.
 * @constructor
 */
function CellRange() {
  this.p0 = new Vec2d();
  this.p1 = new Vec2d();
  this.reset();
}

CellRange.prototype.reset = function() {
  this.p0.setXY(0, 0);
  this.p1.setXY(-1, -1);
};

/**
 * @param {CellRange} that
 */
CellRange.prototype.set = function(that) {
  this.p0.set(that.p0);
  this.p1.set(that.p1);
};

Poolify(CellRange);
