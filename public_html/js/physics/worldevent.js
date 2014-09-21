/**
 * A union of all the world event types and their fields, as a SkipList node.
 * @constructor
 */
function WorldEvent() {
  this.next = [];
  this.timeoutVals = [];
  this.reset();
}

Poolify(WorldEvent);

WorldEvent.TYPE_TIMEOUT = 1;
WorldEvent.TYPE_GRID_ENTER = 2;
WorldEvent.TYPE_GRID_EXIT = 3;
WorldEvent.TYPE_HIT = 4;

WorldEvent.prototype.reset = function() {
  // SkipQueue node stuff
  this.time = 0;
  this.next.length = 0;

  // unique event ID
  this.id = 0;

  // Which kind of event is it?
  this.type = 0;

  // timeout fields
  this.spiritId = 0;
  this.timeoutVals.length = 0;

  // grid enter/exit cell range
  this.gridX0 = 0;
  this.gridY0 = 0;
  this.gridX1 = 0;
  this.gridY1 = 0;

  // hit fields
  this.pathId0 = 0;
  this.pathId1 = 0;
};
