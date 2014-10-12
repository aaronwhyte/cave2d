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

  this.grid = {};

  this.queue = new SkipQueue(World.SKIP_QUEUE_BASE,
      SkipQueue.getRecommendedMaxLevel(100, World.SKIP_QUEUE_BASE));

  this.now = 1;

  this.hitDetector = new HitDetector();
}

World.SKIP_QUEUE_BASE = 2;

World.GRID_HUGENESS = 10000;

/**
 * The width and height of grid cells.
 * The cell at index 0, 0 has its center at 0, 0.
 * The cell at index -1, 1 has its center at -CELL_SIZE, CELL_SIZE.
 */
World.CELL_SIZE = 15;

World.prototype.cellCoord = function(worldCoord) {
  return Math.round(worldCoord / World.CELL_SIZE);
};

World.prototype.gridIndexForCellCoords = function(ix, iy) {
  return World.GRID_HUGENESS * ix + iy;
};

World.prototype.getCell = function(ix, iy) {
  return this.grid[this.gridIndexForCellCoords(ix, iy)];
};

World.prototype.setCell = function(cell, ix, iy) {
  this.grid[this.gridIndexForCellCoords(ix, iy)] = cell;
  return cell;
};

World.prototype.removeCell = function(ix, iy) {
  var index = this.gridIndexForCellCoords(ix, iy);
  var cell = this.grid[index];
  if (cell) {
    delete this.grid[index];
    cell.free();
  }
};

World.prototype.newId = function() {
  return this.nextId++;
};

/**
 * Assigns an ID and adds the spirit.
 * @returns the new spirit ID.
 */
World.prototype.addSpirit = function(spirit) {
  spirit.id = this.newId();
  this.spirits[spirit.id] = spirit;
  return spirit.id;
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
  this.invalidBodies[body.id] = body;
  return body.id;
};

World.prototype.removeBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    delete this.bodies[body.id];
    delete this.paths[body.pathId];
    delete this.invalidBodies[body.id];
    body.free();
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
    if (!body) continue;
    delete this.invalidBodies[bodyId];
    if (body.pathId) {
      delete this.paths[body.pathId];
    }

    // Update path
    body.moveToTime(this.now);
    body.pathId = this.newId();
    this.paths[body.pathId] = body;

    // Add initial set of events.
    this.addPathToGrid(body);
    this.addFirstGridEvent(body, WorldEvent.TYPE_GRID_ENTER, Vec2d.X);
    this.addFirstGridEvent(body, WorldEvent.TYPE_GRID_ENTER, Vec2d.Y);
    this.addFirstGridEvent(body, WorldEvent.TYPE_GRID_EXIT, Vec2d.X);
    this.addFirstGridEvent(body, WorldEvent.TYPE_GRID_EXIT, Vec2d.Y);
  }
};

World.prototype.addPathToGrid = function(body) {
  var brect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var ix0 = this.cellCoord(brect.pos.x - brect.rad.x);
  var iy0 = this.cellCoord(brect.pos.y - brect.rad.y);
  var ix1 = this.cellCoord(brect.pos.x + brect.rad.x);
  var iy1 = this.cellCoord(brect.pos.y + brect.rad.y);
  for (var iy = iy0; iy <= iy1; iy++) {
    for (var ix = ix0; ix <= ix1; ix++) {
      var cell = this.getCell(ix, iy);
      if (!cell) {
        cell = this.setCell(Cell.alloc(this.getGroupCount()), ix, iy);
      }
      this.addPathToCell(body, cell);
    }
  }
  brect.free();
};

World.prototype.getGroupCount = function() {
  return 5; // TODO base this on the way the world was initialized
};

World.prototype.addPathToCell = function(body, cell) {
  var group = body.hitGroup;
  var pathIdSet = cell.getPathIdSetForGroup(group);
  for (var pathId in pathIdSet) {
    var otherBody = this.paths[pathId];
    if (otherBody && otherBody.pathId == pathId) {
      var hitEvent = this.hitDetector.calcHit(this.now, body, otherBody);
      if (hitEvent) {
        this.queue.add(hitEvent);
      }
    } else {
      cell.removePathIdFromGroup(pathId, group);
    }
  }
  cell.addPathIdToGroup(body.pathId, body.hitGroup);

};

/**
 * Checks to see if the body's path will enter/exit a CellRange
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 * @param {String} eventType WorldEvent TYPE const.
 * @param {String} axis The axis along which the object travels (not the axis it crosses)
 */
World.prototype.addFirstGridEvent = function(body, eventType, axis) {
  var v = body.vel;
  if (!v[axis]) return;
  var perp = Vec2d.otherAxis(axis);

  // Calculate the leading/trailing point "p" on the moving bounding rect.
  var rect = body.getBoundingRectAtTime(this.now, Rect.alloc());
  var vSign = Vec2d.alloc().set(body.vel).sign();

  var p = Vec2d.alloc().set(rect.rad).multiply(vSign);
  if (eventType === WorldEvent.TYPE_GRID_EXIT) {
    p.scale(-1);
  }
  p.add(rect.pos);

  // c is the center of the cell that p is in.
  var c = Vec2d.alloc().set(p).roundToGrid(World.CELL_SIZE);

  // Calculate crossing times
  var t = this.now + (c[axis] + 0.5 * vSign[axis] * World.CELL_SIZE - p[axis]) / v[axis];
  if (t < this.now) {
    console.error("oh crap", t, this.now);
  } else if (t <= body.getPathEndTime()) {
    var e = WorldEvent.alloc();
    e.type = eventType;
    e.axis = axis;
    e.time = t;
    e.pathId = body.pathId;

    // Is the event about entering the next set of cells, or leaving the current one?
    e.cellRange.p0[axis] = e.cellRange.p1[axis] = this.cellCoord(c[axis]) +
        (eventType === WorldEvent.TYPE_GRID_ENTER ? vSign[axis] : 0);
    // The length of the crossing, in cells, depends on the position of the bounding rect at that time.
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.p0[perp] = this.cellCoord(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.cellCoord(rect.pos[perp] + rect.rad[perp]);
    this.queue.add(e);
  }
  c.free();
  p.free();
  vSign.free();
  rect.free();
};

World.prototype.addSubsequentGridEvent = function(body, prevEvent) {
  var axis = prevEvent.axis;
  var eventType = prevEvent.type;
  var v = body.vel;
  if (!v[axis]) return;
  var perp = Vec2d.otherAxis(axis);

  var vSign = Vec2d.alloc().set(v).sign();
  var nextCellIndex = prevEvent.cellRange.p0[axis] + vSign[axis];
  // What time will the point reach that cell index?
  var rad = vSign[axis] * (body.shape == Body.Shape.CIRCLE ? body.rad : body.rectRad[axis]);
  var dest;
  if (eventType == WorldEvent.TYPE_GRID_ENTER) {
    dest = (nextCellIndex - 0.5 * vSign[axis]) * World.CELL_SIZE - rad;
  } else {
    dest = (nextCellIndex + 0.5 * vSign[axis]) * World.CELL_SIZE + rad;
  }
  var t = body.pathStartTime + (dest - body.pathStartPos[axis]) / v[axis];
  if (t < this.now) {
    console.error("oh crap", t, this.now);
  } else if (t <= body.getPathEndTime()) {
    var e = WorldEvent.alloc();
    e.type = eventType;
    e.axis = axis;
    e.time = t;
    e.pathId = body.pathId;

    // Is the event about entering the next set of cells, or leaving the current one?
    e.cellRange.p0[axis] = e.cellRange.p1[axis] = nextCellIndex;
    // The length of the crossing, in cells, depends on the position of the bounding rect at that time.
    var rect = Rect.alloc();
    body.getBoundingRectAtTime(t, rect);
    e.cellRange.p0[perp] = this.cellCoord(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.cellCoord(rect.pos[perp] + rect.rad[perp]);
    rect.free();
    this.queue.add(e);
  }
  vSign.free();
};

World.prototype.getNextEvent = function() {
  this.validateBodies();
  return this.queue.getFirst();
};

World.prototype.processNextEvent = function() {
  this.validateBodies();
  var e = this.queue.removeFirst();
  this.now = e.time;

  if (e.type === WorldEvent.TYPE_GRID_ENTER) {
    var body = this.paths[e.pathId];
    if (body && body.pathId == e.pathId) {
      this.addSubsequentGridEvent(body, e);
      for (var iy = e.cellRange.p0.y; iy <= e.cellRange.p1.y; iy++) {
        for (var ix = e.cellRange.p0.x; ix <= e.cellRange.p1.x; ix++) {
          var cell = this.getCell(ix, iy);
          if (!cell) {
            cell = this.setCell(Cell.alloc(this.getGroupCount()), ix, iy);
          }
          this.addPathToCell(body, cell);
        }
      }
    }

  } else if (e.type === WorldEvent.TYPE_GRID_EXIT) {
    var body = this.paths[e.pathId];
    if (body && body.pathId == e.pathId) {
      this.addSubsequentGridEvent(body, e);
      for (var iy = e.cellRange.p0.y; iy <= e.cellRange.p1.y; iy++) {
        for (var ix = e.cellRange.p0.x; ix <= e.cellRange.p1.x; ix++) {
          var cell = this.getCell(ix, iy);
          if (cell) {
            cell.removePathIdFromGroup(body.pathId, body.hitGroup);
            if (cell.isEmpty()) {
              this.removeCell(ix, iy);
            }
          }
        }
      }
    }

  } else if (e.type === WorldEvent.TYPE_HIT) {
    // Let the game handle it.
  } else if (e.type === WorldEvent.TYPE_TIMEOUT) {
    var spirit = this.spirits[e.spiritId];
    if (spirit) {
      spirit.onTimeout(this, e);
    }
  }
  e.free();
};

World.prototype.addTimeout = function(time, spiritId, vals) {
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_TIMEOUT;
  e.time = time;
  e.spiritId = spiritId;
  // TODO e.vals
  this.queue.add(e);
};
//- removeTimeout
//(later: rayscans)
