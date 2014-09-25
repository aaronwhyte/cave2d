/**
 * Handles spirits and bodies.
 * @constructor
 */
function World() {

  // spiritId to Spirit
  this.spirits = {};

  // bodyId to Body
  this.bodies = {};

  // pathId to Body. Obsolete pathIds might still point to their old Bodies, so check the body's pathId.
  this.paths = {};

  // bodyId to body. Body objects that need to have their paths processed by the collider
  // before time can move forward. This includes newly-added bodies.
  this.invalidBodies = {};

  this.nextId = 10;

  this.cells = {};

  this.queue = new SkipQueue(World.SKIP_QUEUE_BASE,
      SkipQueue.getRecommendedMaxLevel(100, World.SKIP_QUEUE_BASE));

  this.now = 1;
}

World.SKIP_QUEUE_BASE = 2;

World.GRID_WIDTH = 1000000;

/**
 * The width and height of grid cells.
 * The cell at index 0, 0 has its center at 0, 0.
 * The cell at index -1, 1 has its center at -CELL_SIZE, CELL_SIZE.
 */
World.CELL_SIZE = 5;

World.prototype.newId = function() {
  return this.nextId++;
};

World.prototype.getCellIndex = function(cellX, cellY) {
  return World.GRID_WIDTH * cellY + cellY;
};

World.prototype.getCell = function(ix, iy) {
  return this.cells[this.getCellIndex(ix, iy)];
};

/**
 * Assigns an ID and adds the body.
 * @returns the new body ID.
 */
World.prototype.addBody = function(body) {
  body.id = this.newId();

  // Hook the path invalidator into the body. A wee bit hacky.
  body.invalidBodies = this.invalidBodies;

  // Add it to the bodies index and to the invalid bodies index.
  // The next time the clock moves forward, the invalid body will be addressed.
  this.bodies[body.id] = body;
  this.invalidatePathByBodyId(body.id);
  return body.id;
};

World.prototype.invalidatePathByBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    delete this.paths[body.pathId];
    this.invalidBodies[bodyId] = body;
    body.pathId = 0;
  }
};

World.prototype.removeBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    delete this.bodies[body.id];
    delete this.paths[body.pathId];
    delete this.invalidBodies[body.id];
  }
};

World.prototype.getBody = function(bodyId) {
  return this.bodies[bodyId];
};

/**
 * Also purges obsolete pathIds from the index.
 * @param pathId
 * @returns {*}
 */
World.prototype.getBodyByPathId = function(pathId) {
  var body = this.paths[pathId];
  if (body && body.pathId != pathId) {
    delete this.paths[pathId];
    body = null;
  }
  return body;
};

World.prototype.validateBodies = function() {
  for (var bodyId in this.invalidBodies) {
    var body = this.invalidBodies[bodyId];
    delete this.invalidBodies[bodyId];
    if (!body) continue;

    // Update path
    body.moveToTime(this.now);
    body.pathId = this.newId();
    this.paths[body.pathId] = body;

    this.addNextGridEvent(body, WorldEvent.TYPE_GRID_ENTER, Vec2d.X);
    this.addNextGridEvent(body, WorldEvent.TYPE_GRID_ENTER, Vec2d.Y);

    this.addNextGridEvent(body, WorldEvent.TYPE_GRID_EXIT, Vec2d.X);
    this.addNextGridEvent(body, WorldEvent.TYPE_GRID_EXIT, Vec2d.Y);

//    this.addToCells(body);
  }
//  console.log("Queue: " + this.queue.toString());
};

/**
 * Checks to see if the body's path will enter/exit a CellRange
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 * @param {String} eventType WorldEvent TYPE const.
 * @param {String} axis The axis along which the object travels (not the axis it crosses)
 */
World.prototype.addNextGridEvent = function(body, eventType, axis) {
  var v = body.vel;
  if (!v[axis]) return;
  var perp = Vec2d.otherAxis(axis);

  // Calculate the leading/trailing point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var vSign = Vec2d.alloc().set(body.vel).sign();
  var p = Vec2d.alloc().set(rect.rad).multiply(vSign);
  if (eventType === WorldEvent.TYPE_GRID_EXIT) {
    p.scale(-1)
  }
  p.add(rect.pos);

  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);

  // Calculate crossing times
  var t, e;
  t = this.now + (c[axis] + vSign[axis] * World.CELL_SIZE / 2 - p[axis]) / v[axis];
  if (t > this.now && t <= body.getPathEndTime()) {
    e = WorldEvent.alloc();
    e.type = eventType;
    e.axis = axis;
    e.time = t;
    e.pathId = body.pathId;

    // Is the event about entering the next set of cells or leaving the current one?
    e.cellRange.p0[axis] = e.cellRange.p1[axis] = this.getCellIndex(c[axis]) +
        (eventType === WorldEvent.TYPE_GRID_ENTER) ? vSign[axis] : 0;
    // Exit size depend on bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.p0[perp] = this.getCellIndex(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.getCellIndex(rect.pos[perp] + rect.rad[perp]);
    this.queue.add(e);
  }
  p.free();
  vSign.free();
  rect.free();
};

World.prototype.getCellIndex = function(worldCoord) {
  return Math.round(worldCoord / World.CELL_SIZE)
};

//World.prototype.addTimeout = function(timeout) {
//};
//- removeTimeout
//(later: rayscans)
