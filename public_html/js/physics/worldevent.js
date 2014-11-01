/**
 * A union of all the world event types and their fields, as a SkipList node.
 * @constructor
 */
function WorldEvent() {
  this.next = [];
  this.timeoutVals = [];
  this.cellRange = new CellRange(0, 0, -1, -1);

  // This is a vector along which collision acceleration should be applied,
  // for default elastic collision resolution.
  this.collisionVec = new Vec2d();
  this.reset();
}

WorldEvent.TYPE_TIMEOUT = 'timeout';
WorldEvent.TYPE_GRID_ENTER = 'enter';
WorldEvent.TYPE_GRID_EXIT = 'exit';
WorldEvent.TYPE_HIT = 'hit';

WorldEvent.prototype.reset = function() {
  // SkipQueue node stuff
  this.time = 0;
  this.next.length = 0;

  // Which kind of event is it? One of the TYPE constants.
  this.type = 0;

  // timeout fields
  this.spiritId = 0;
  this.timeoutVals.length = 0;

  // grid enter/exit cell range
  this.axis = null; // one of Vec2d.X or Vec2d.Y
  this.pathId = 0;
  this.cellRange.reset();

  // hit fields
  this.pathId0 = 0;
  this.pathId1 = 0;
  this.collisionVec.reset();
  // this.axis, if set, means there was a hit on a side of a rectangle. X means it was east or west, Y is N or S.

  return this;
};

WorldEvent.pool = [];

WorldEvent.alloc = function() {
  if (WorldEvent.pool.length) {
    return WorldEvent.pool.pop().reset();
  }
  return new WorldEvent();
};

WorldEvent.prototype.free = function() {
  WorldEvent.pool.push(this);
};

WorldEvent.prototype.toString = function() {
  var s = [];
  s.push('{time: ', this.time, ', type: ', this.type);
  if (this.type === WorldEvent.TYPE_TIMEOUT) {
    s.push(', spiritId: ', this.spiritId);
  } else if (this.type === WorldEvent.TYPE_GRID_ENTER || this.type === WorldEvent.TYPE_GRID_EXIT) {
    s.push(', pathId: ', this.pathId, ', axis: ' + this.axis, ', cellRange: ' + JSON.stringify(this.cellRange));
  } else if (this.type === WorldEvent.TYPE_HIT) {
    s.push(', pathId0: ', this.pathId0, ', pathId1: ', this.pathId1);
  }
  s.push('}');
  return s.join('');
};
