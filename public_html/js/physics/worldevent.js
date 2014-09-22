/**
 * A union of all the world event types and their fields, as a SkipList node.
 * @constructor
 */
function WorldEvent() {
  this.next = [];
  this.timeoutVals = [];
  this.cellRange = new CellRange(0, 0, -1, -1);
  this.reset();
}

Poolify(WorldEvent);

WorldEvent.TYPE_TIMEOUT = 10;
WorldEvent.TYPE_GRID_ENTER_X = 20;
WorldEvent.TYPE_GRID_ENTER_Y = 21;
WorldEvent.TYPE_GRID_EXIT_X = 30;
WorldEvent.TYPE_GRID_EXIT_Y = 31;
WorldEvent.TYPE_HIT = 40;

WorldEvent.prototype.reset = function() {
  // SkipQueue node stuff
  this.time = 0;
  this.next.length = 0;
//
//  // unique event ID
//  this.id = 0;

  // Which kind of event is it?
  this.type = 0;

  // timeout fields
  this.spiritId = 0;
  this.timeoutVals.length = 0;

  // grid enter/exit cell range
  this.pathId = 0;
  this.cellRange.x0 = 0;
  this.cellRange.y0 = 0;
  this.cellRange.x1 = -1;
  this.cellRange.y1 = -1;

  // hit fields
  this.pathId0 = 0;
  this.pathId1 = 0;
};

WorldEvent.prototype.toString = function() {
  var s = [];
  s.push(
      '{time: ', this.time,
//      ', id: ', this.id,
      ', type: ', this.type,
      ', spiritId: ', this.spiritId,
      ', pathId: ', this.pathId,
      ', cellRange: ' + JSON.stringify(this.cellRange),
      ', pathId0: ', this.pathId0,
      ', pathId1: ', this.pathId1,
      '}');
  return s.join('');
};