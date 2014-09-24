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

    this.addNextGridEnterX(body);
    this.addNextGridEnterY(body);
    this.addNextGridExitX(body);
    this.addNextGridExitY(body);
//    this.addToCells(body);
  }
//  console.log("Queue: " + this.queue.toString());
};

/**
 * Checks to see if the body's path will cross into a new column
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 */
World.prototype.addNextGridEnterX = function(body) {
  var v = body.vel;
  if (!v.x) return;

  // Calculate the leading point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
//  console.log("rect", rect);
  var vSign = Vec2d.alloc().set(body.vel).sign();
//  console.log("vSign", vSign);
  var p = Vec2d.alloc().set(rect.rad).multiply(vSign).add(rect.pos);
//  console.log("p", p);

  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);
//  console.log("c", c);

  // Calculate crossing times
  var t, e;
  t = this.now + (c.x + vSign.x * World.CELL_SIZE / 2 - p.x) / v.x;
  if (t > this.now && t <= body.getPathEndTime()) {
    e = WorldEvent.alloc();
    e.type = WorldEvent.TYPE_GRID_ENTER_X;
    e.time = t;
    e.pathId = body.pathId;
    // Entrance column will be one cell ahead of p's current column.
    e.cellRange.x0 = e.cellRange.x1 = this.getCellIndex(c.x) + vSign.x;
    // Entrance rows depend on bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.y0 = this.getCellIndex(rect.pos.y - rect.rad.y);
    e.cellRange.y1 = this.getCellIndex(rect.pos.y + rect.rad.y);
    this.queue.add(e);
  }
  p.free();
  vSign.free();
  rect.free();
};

/**
 * Checks to see if the body's path will cross into a new row
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 */
World.prototype.addNextGridEnterY = function(body) {
  var v = body.vel;
  if (!v.y) return;

  // Calculate the leading point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var vSign = Vec2d.alloc().set(body.vel).sign();
  var p = Vec2d.alloc().set(rect.rad).multiply(vSign).add(rect.pos);

  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);

  // Calculate crossing times
  var t, e;
  t = this.now + (c.y + vSign.y * World.CELL_SIZE / 2 - p.y) / v.y;
  if (t > this.now && t <= body.getPathEndTime()) {
    e = WorldEvent.alloc();
    e.type = WorldEvent.TYPE_GRID_ENTER_Y;
    e.time = t;
    e.pathId = body.pathId;
    // Entrance row will be one cell ahead of p's current column.
    e.cellRange.y0 = e.cellRange.y1 = this.getCellIndex(c.y) + vSign.y;
    // Entrance rows depend on bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.x0 = this.getCellIndex(rect.pos.x - rect.rad.x);
    e.cellRange.x1 = this.getCellIndex(rect.pos.x + rect.rad.x);
    this.queue.add(e);
  }
  c.free();
  p.free();
  vSign.free();
  rect.free();
};

/**
 * Checks to see if the body's path will exit a column
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 */
World.prototype.addNextGridExitX = function(body) {
  var v = body.vel;
  if (!v.x) return;

  // Calculate the trailing point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var vSign = Vec2d.alloc().set(body.vel).sign();
  var p = Vec2d.alloc().set(rect.rad).multiply(vSign).scale(-1).add(rect.pos);

  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);

  // Calculate crossing times
  var t, e;
  t = this.now + (c.x + vSign.x * World.CELL_SIZE / 2 - p.x) / v.x;
  if (t > this.now && t <= body.getPathEndTime()) {
    e = WorldEvent.alloc();
    e.type = WorldEvent.TYPE_GRID_EXIT_X;
    e.time = t;
    e.pathId = body.pathId;
    // Exit column will be p's current column.
    e.cellRange.x0 = e.cellRange.x1 = this.getCellIndex(c.x);
    // Exit rows depend on bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.y0 = this.getCellIndex(rect.pos.y - rect.rad.y);
    e.cellRange.y1 = this.getCellIndex(rect.pos.y + rect.rad.y);
    this.queue.add(e);
  }
  p.free();
  vSign.free();
  rect.free();
};

/**
 * Checks to see if the body's path will exit a row
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 */
World.prototype.addNextGridExitY = function(body) {
  var v = body.vel;
  if (!v.y) return;

  // Calculate the trailing point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var vSign = Vec2d.alloc().set(body.vel).sign();
  var p = Vec2d.alloc().set(rect.rad).multiply(vSign).scale(-1).add(rect.pos);
  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);

  // Calculate crossing times
  var t, e;
  t = this.now + (c.y + vSign.y * World.CELL_SIZE / 2 - p.y) / v.y;
  if (t > this.now && t <= body.getPathEndTime()) {
    e = WorldEvent.alloc();
    e.type = WorldEvent.TYPE_GRID_EXIT_Y;
    e.time = t;
    e.pathId = body.pathId;
    // Exit row will be p's current row.
    e.cellRange.y0 = e.cellRange.y1 = this.getCellIndex(c.y);
    // Exit cols depend on bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.x0 = this.getCellIndex(rect.pos.x - rect.rad.x);
    e.cellRange.x1 = this.getCellIndex(rect.pos.x + rect.rad.x);
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
