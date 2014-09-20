/**
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
}

World.GRID_WIDTH = 1000000;

World.prototype.newId = function() {
  return this.nextId++;
};

World.prototype.getCellIndex = function(cellX, cellY) {
  return World.GRID_WIDTH * cellY + cellY;
};

World.prototype.getCell = function(ix, iy) {
  return this.cells[this.getCellIndex(ix, iy)];
};

World.prototype.addBody = function(body) {
  body.id = this.newId();
  body.invalidBodies = this.invalidBodies;
  this.bodies[body.id] = body;
  this.invalidatePathByBodyId(body);
  var range = CellRange.alloc();
  // TODO: stick the body in the cell grid
  range.free();
  return body.id;
};

World.prototype.invalidatePathByBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    delete this.paths[body.pathid];
    this.invalidBodies[bodyId] = body;
    body.pathId = 0;
  }
};

World.prototype.removeBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    delete this.bodies[body.id];
    delete this.paths[body.pathid];
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

//World.prototype.addTimeout = function(timeout) {
//};
//- removeTimeout
//(later: rayscans)
