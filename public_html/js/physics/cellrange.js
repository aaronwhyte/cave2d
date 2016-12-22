/**
 * A rectangular range of cells in a grid.
 * @constructor
 */
function CellRange() {
  this.p0 = new Vec2d();
  this.p1 = new Vec2d();
  this.reset();
}
CellRange.SCHEMA = {
  0: 'p0',
  1: 'p1'
};

CellRange.prototype.reset = function() {
  this.p0.setXY(0, 0);
  this.p1.setXY(-1, -1);
};

CellRange.getJsoner = function() {
  if (!CellRange.jsoner) {
    CellRange.jsoner = new Jsoner(CellRange.SCHEMA);
  }
  return CellRange.jsoner;
};

CellRange.prototype.toJSON = function() {
  return CellRange.getJsoner().toJSON(this);
};

CellRange.prototype.setFromJSON = function(json) {
  CellRange.getJsoner().setFromJSON(json, this);
  return this;
};


/**
 * @param {CellRange} that
 */
CellRange.prototype.set = function(that) {
  this.p0.set(that.p0);
  this.p1.set(that.p1);
};

Poolify(CellRange);

