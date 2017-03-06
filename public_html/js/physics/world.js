/**
 * Handles spirits and bodies.
 *
 * @param {=number} opt_cellSize The world-space size of each cell in the collision-detection grid.
 * If it's too small, time is wasted as things enter and exit cells. If it's too big,
 * we suffer from O(n^2) collision detection speed within each cell.
 * If falsey, this defaults to 15.
 *
 * @param {=number} opt_groupCount The number of collision groups in each cell.
 * If falsey, this defaults to 1.
 *
 * @param {=Array} opt_groupPairs An array of 2-element arrays, defining all the group pairs
 * that can collide with each other. The two IDs in a pair may be the same, to make
 * a group's members collide with each other.
 * If falsey, this defaults to one group, "0", which collides with itself.
 *
 * @param {=SpiritFactory} opt_spiritFactory If you want undo support, you'll need a spirit factory.
 *
 * @constructor
 */
function World(opt_cellSize, opt_groupCount, opt_groupPairs, opt_spiritFactory) {
  this.cellSize = opt_cellSize || World.DEFAULT_CELL_SIZE;
  this.groupCount = opt_groupCount || 1;
  this.groupPairs = opt_groupPairs || [[0, 0]];
  this.spiritFactory = opt_spiritFactory || null;
  this.groupHitsGroups = [];
  for (var i = 0; i < this.groupPairs.length; i++) {
    var pair = this.groupPairs[i];
    for (var a = 0; a < 2; a++) {
      var b = (a + 1) % 2;
      var list = this.groupHitsGroups[pair[a]];
      if (!list) {
        list = this.groupHitsGroups[pair[a]] = [];
      }
      if (list.indexOf(pair[b]) < 0) {
        list.push(pair[b]);
      }
    }
  }

  // spiritId to Spirit
  this.spirits = {};

  // bodyId to Body
  this.bodies = {};

  // pathId to Body. Obsolete pathIds might still point to their old Bodies, so check the body's pathId.
  this.paths = {};

  // bodyId to "true". Holds IDs of body objects that need to have their paths processed by the collider
  // before time can move forward. This includes newly-added bodies.
  // Bodies can be invalid for a time, so that they can be manipulated while time is standing still,
  // without having to recompute collisions every time.
  this.invalidBodyIds = {};

  this.nextId = 10;

  this.grid = {};

  this.queue = new SkipQueue(World.SKIP_QUEUE_BASE,
      SkipQueue.getRecommendedMaxLevel(100, World.SKIP_QUEUE_BASE));

  this.now = 1;

  this.hitDetector = new HitDetector();
  this.hitTimePadding = 0.01;

  // cache for rayscans and overlap scans.
  this.scannedBodyIds = new ObjSet();

  // If you want this enabled, do it as part of world creation
  this.changeRecordingEnabled = false;

  // This is counted, so nesting can work
  this.changeRecordingPaused = 0;

  this.bodyBefores = null;
  this.spiritBefores = null;
  this.nowBefore = null;
  this.timeoutsBefore = null;
}

World.SKIP_QUEUE_BASE = 2;

// 5% fudge factor when deciding what cells an object is in.
World.BRECT_FUDGE_FACTOR = 0.05;

World.GRID_HUGENESS = 10000;

/**
 * The width and height of grid cells.
 * The cell at index 0, 0 has its center at 0, 0.
 * The cell at index -1, 1 has its center at -CELL_SIZE, CELL_SIZE.
 */
World.DEFAULT_CELL_SIZE = 15;

World.ChangeType = {
  BODY: 'wb',
  SPIRIT: 'ws',
  NOW: 'wn',
  QUEUE: 'wq'
};

World.prototype.cellCoord = function(worldCoord) {
  return Math.round(worldCoord / this.cellSize);
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

/**
 * @returns {number}
 */
World.prototype.newId = function() {
  return this.nextId++;
};

/**
 * Assigns an ID and adds the spirit.
 * @return {number} the new spirit ID.
 */
World.prototype.addSpirit = function(spirit) {
  spirit.id = this.newId();
  this.loadSpirit(spirit);
  return spirit.id;
};

/**
 * Adds the spirit using the ID it already has.
 */
World.prototype.loadSpirit = function(spirit) {
  if (this.spirits[spirit.id]) throw Error("Spirit with id '" + spirit.id + "' already exists!");
  this.spirits[spirit.id] = spirit;
  this.nextId = Math.max(this.nextId, spirit.id + 1);

  if (this.changeRecordingEnabled) {
    spirit.setChangeListener(this);
    this.maybeRecordSpiritBefore(spirit.id, null);
  }
};

/**
 * If the spirit is found it is removed, and if it has a free() method, it is freed too.
 * @param id
 */
World.prototype.removeSpiritId = function(id) {
  var spirit = this.spirits[id];
  if (spirit) {
    this.maybeRecordSpiritBefore(id, spirit);
    delete this.spirits[id];
    if (spirit.free) {
      spirit.free();
    }
  }
};

/**
 * Assigns an ID and adds the body.
 * @returns {number} the new body ID
 */
World.prototype.addBody = function(body) {
  body.id = this.newId();
  this.loadBody(body);
  return body.id;
};

/**
 * Adds the body using the ID it already has.
 */
World.prototype.loadBody = function(body) {
  if (this.bodies[body.id]) throw Error("Body with id '" + body.id + "' already exists!");
  // Add it to the bodies index and to the invalid bodies index.
  // The next time the clock moves forward, the invalid body will be addressed.
  this.bodies[body.id] = body;
  this.nextId = Math.max(this.nextId, body.id + 1);

  // Hook the path invalidator into the body. A wee bit hacky.
  body.invalidBodyIds = this.invalidBodyIds;
  body.invalidatePath();

  if (this.changeRecordingEnabled) {
    body.setChangeListener(this);
    this.maybeRecordBodyBefore(body.id, null);
  }
};

/**
 * Removes the body from the world, and frees the body instance back into the class pool.
 * @param bodyId
 */
World.prototype.removeBodyId = function(bodyId) {
  var body = this.bodies[bodyId];
  if (body) {
    this.maybeRecordBodyBefore(bodyId, body);
    var rect = Rect.alloc();
    this.getPaddedBodyBoundingRect(body, this.now, rect);
    var range = CellRange.alloc();
    this.getCellRangeForRect(rect, range);
    this.removeBodyFromCellRange(body, range);
    range.free();
    rect.free();
    delete this.bodies[body.id];
    delete this.paths[body.pathId];
    delete this.invalidBodyIds[body.id];
    body.free();
  } else {
    console.log("couldn't find or remove bodyId " + bodyId);
  }
};

World.prototype.removeBodyFromCellRange = function(body, cellRange) {
  for (var iy = cellRange.p0.y; iy <= cellRange.p1.y; iy++) {
    for (var ix = cellRange.p0.x; ix <= cellRange.p1.x; ix++) {
      var cell = this.getCell(ix, iy);
      if (cell) {
        cell.removePathIdFromGroup(body.pathId, body.hitGroup);
        if (cell.isEmpty()) {
          this.removeCell(ix, iy);
        }
      }
    }
  }
};

World.prototype.getBody = function(bodyId) {
  this.validateBodies();
  return this.bodies[bodyId];
};

/**
 * Also purges obsolete pathIds from the index.
 * @param pathId
 * @returns {*}
 */
World.prototype.getBodyByPathId = function(pathId) {
  this.validateBodies();
  var body = this.paths[pathId];
  if (body && body.pathId != pathId) {
    delete this.paths[pathId];
    body = null;
  }
  if (body && !this.bodies[body.id]) {
    console.warn("getBodyByPathId is writing checks that bodies cannot cash. pathId", pathId, "body.id:", body.id);
  }
  return body;
};

/**
 * Make sure all the invalidated bodies get added to the grid with events enqueued.
 * It's good to do this after manipulating bodies and before reading them.
 */
World.prototype.validateBodies = function() {
  for (var bodyId in this.invalidBodyIds) {
    delete this.invalidBodyIds[bodyId];
    var body = this.bodies[bodyId];
    if (!body) continue;
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

World.prototype.getCellRangeForRect = function(rect, range) {
  range.p0.setXY(
      this.cellCoord(rect.pos.x - rect.rad.x),
      this.cellCoord(rect.pos.y - rect.rad.y));
  range.p1.setXY(
      this.cellCoord(rect.pos.x + rect.rad.x),
      this.cellCoord(rect.pos.y + rect.rad.y));
  return range;
};

World.prototype.addPathToGrid = function(body) {
  var brect = this.getPaddedBodyBoundingRect(body, this.now, Rect.alloc());
  var range = this.getCellRangeForRect(brect, CellRange.alloc());
  for (var iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (var ix = range.p0.x; ix <= range.p1.x; ix++) {
      var cell = this.getCell(ix, iy);
      if (!cell) {
        cell = this.setCell(Cell.alloc(this.getGroupCount()), ix, iy);
      }
      this.addPathToCell(body, cell);
    }
  }
  range.free();
  brect.free();
};

World.prototype.getGroupCount = function() {
  return this.groupCount;
};

World.prototype.addPathToCell = function(body, cell) {
  var nextEvent = WorldEvent.alloc();
  var group = body.hitGroup;

  var hitGroups = this.groupHitsGroups[group];
  for (var gi = 0; gi < hitGroups.length; gi++) {
    var otherGroup = hitGroups[gi];
    var pathIdSet = cell.getPathIdsForGroup(otherGroup);
    var pathIdArray = pathIdSet.vals;
    for (var pi = 0; pi < pathIdArray.length;) {
      var pathId = pathIdArray[pi];
      var otherBody = this.paths[pathId];
      if (otherBody && otherBody.pathId == pathId) {
        var hitEvent = this.hitDetector.calcHit(this.now, body, otherBody, nextEvent);
        if (hitEvent && hitEvent.time < Infinity) {
          // Pad the collision time to prevent numerical-challenge interpenetration.
          hitEvent.time = Math.max(hitEvent.time - this.hitTimePadding, this.now);
          // Add the existing event and allocate the next one.
          this.queue.add(hitEvent);
          nextEvent = WorldEvent.alloc();
        }
        pi++;
      } else {
        pathIdSet.removeIndex(pi);
      }
    }
  }
  cell.addPathIdToGroup(body.pathId, group);
  nextEvent.free();
};

/**
 * Checks to see if the body's path will enter/exit a CellRange
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 * @param {String} eventType WorldEvent TYPE const.
 * @param {String} axis The axis along which the object travels (not the axis it crosses)
 * @param {WorldEvent} eventOut
 * @return {?WorldEvent} if there is an event, or null otherwise.
 */
World.prototype.getFirstGridEvent = function(body, eventType, axis, eventOut) {
  var v = body.vel;
  if (!v[axis]) return null;
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
  var c = Vec2d.alloc().set(p).roundToGrid(this.cellSize);

  // Calculate crossing times
  var e = null;
  var t = this.now + (c[axis] + 0.5 * vSign[axis] * this.cellSize - p[axis]) / v[axis];
  if (t < this.now) {
    console.error("oh crap, grid event time < now:", t, this.now);
  } else if (t <= body.getPathEndTime()) {
    e = eventOut;
    e.type = eventType;
    e.axis = axis;
    e.time = t;
    e.pathId = body.pathId;

    // Is the event about entering the next set of cells, or leaving the current one?
    e.cellRange.p0[axis] = e.cellRange.p1[axis] = this.cellCoord(c[axis]) +
        (eventType === WorldEvent.TYPE_GRID_ENTER ? vSign[axis] : 0);
    // The length of the crossing, in cells, depends on the position of the bounding rect at that time.
    this.getPaddedBodyBoundingRect(body, t, rect);
    e.cellRange.p0[perp] = this.cellCoord(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.cellCoord(rect.pos[perp] + rect.rad[perp]);
  }
  c.free();
  p.free();
  vSign.free();
  rect.free();
  return e;
};

/**
 * Checks to see if the body's path will enter/exit a CellRange
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 * @param {String} eventType WorldEvent TYPE const.
 * @param {String} axis The axis along which the object travels (not the axis it crosses)
 */
World.prototype.addFirstGridEvent = function(body, eventType, axis) {
  var event = WorldEvent.alloc();
  if (this.getFirstGridEvent(body, eventType, axis, event)) {
    this.queue.add(event);
  } else {
    event.free();
  }
};

/**
 * Checks to see if the body's path will enter/exit a CellRange
 * before the path expires, and allocates and adds the event if so.
 * @param {Body} body
 * @param {WorldEvent} prevEvent The grid event before this one.
 * @param {WorldEvent} eventOut
 * @return {?WorldEvent} if there is an event, or null otherwise.
 */
World.prototype.getSubsequentGridEvent = function(body, prevEvent, eventOut) {
  var axis = prevEvent.axis;
  var eventType = prevEvent.type;
  var v = body.vel;
  if (!v[axis]) return null;
  var perp = Vec2d.otherAxis(axis);

  var vSign = Vec2d.alloc().set(v).sign();
  var nextCellIndex = prevEvent.cellRange.p0[axis] + vSign[axis];
  // What time will the point reach that cell index?
  var rad = vSign[axis] * (body.shape == Body.Shape.CIRCLE ? body.rad : body.rectRad[axis]);
  var dest;
  if (eventType == WorldEvent.TYPE_GRID_ENTER) {
    dest = (nextCellIndex - 0.5 * vSign[axis]) * this.cellSize - rad;
  } else {
    dest = (nextCellIndex + 0.5 * vSign[axis]) * this.cellSize + rad;
  }
  var t = body.pathStartTime + (dest - body.pathStartPos[axis]) / v[axis];
  var e = null;
  if (t < this.now) {
    console.error("oh crap", t, this.now);
  } else if (t <= body.getPathEndTime()) {
    e = eventOut;
    e.type = eventType;
    e.axis = axis;
    e.time = t;
    e.pathId = body.pathId;

    // Is the event about entering the next set of cells, or leaving the current one?
    e.cellRange.p0[axis] = e.cellRange.p1[axis] = nextCellIndex;
    // The length of the crossing, in cells, depends on the position of the bounding rect at that time.
    var rect = Rect.alloc();
    this.getPaddedBodyBoundingRect(body, t, rect);
    e.cellRange.p0[perp] = this.cellCoord(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.cellCoord(rect.pos[perp] + rect.rad[perp]);
    rect.free();
  }
  vSign.free();
  return e;
};

World.prototype.addSubsequentGridEvent = function(body, prevEvent) {
  var event = WorldEvent.alloc();
  if (this.getSubsequentGridEvent(body, prevEvent, event)) {
    this.queue.add(event);
  } else {
    event.free();
  }
};

/**
 * Returns the next event in the queue, without dequeueing it.
 */
World.prototype.getNextEvent = function() {
  this.validateBodies();
  return this.queue.getFirst();
};

/**
 * Removes the next event from the queue AND FREES IT, and advances the world time to the event time,
 * optionally doing some internal processing.
 */
World.prototype.processNextEvent = function() {
  this.processNextEventWthoutFreeing().free();
};

/**
 var * Removes the next event from the queue, and advances the world time to the event time,
 * optionally doing some internal processing.
 */
World.prototype.processNextEventWthoutFreeing = function() {
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
      this.removeBodyFromCellRange(body, e.cellRange);
    }

  } else if (e.type === WorldEvent.TYPE_HIT) {
    // Let the game handle it.

  } else if (e.type === WorldEvent.TYPE_TIMEOUT) {
    var spirit = this.spirits[e.spiritId];
    if (spirit) {
      spirit.onTimeout(this, e.timeoutVal);
    }
  }
  return e;
};

World.prototype.addTimeout = function(time, spiritId, timeoutVal) {
  var e = WorldEvent.alloc();
  e.type = WorldEvent.TYPE_TIMEOUT;
  e.time = time;
  e.spiritId = spiritId;
  e.timeoutVal = timeoutVal;
  this.queue.add(e);
};

/**
 * Adds the timeout to the event queue.
 */
World.prototype.loadTimeout = function(e) {
  this.addTimeout(e.time, e.spiritId, e.timeoutVal);
};

/**
 * Performs an immediate rayscan. If there's a hit, this will return true,
 * and the response will be populated. Otherwise it will be untouched.
 * @param {ScanRequest} req Input param
 * @param {ScanResponse} resp Output param.
 * @return {boolean} true if there's a hit, false if not.
 */
World.prototype.rayscan = function(req, resp) {
  this.validateBodies();
  this.scannedBodyIds.reset();
  var foundHit = false;

  // Create a Body based on the ScanRequest.
  var b = Body.alloc();
  b.hitGroup = req.hitGroup;
  b.setPosAtTime(req.pos, this.now);
  b.vel.set(req.vel);
  b.shape = req.shape;
  b.rad = req.rad;
  b.rectRad.set(req.rectRad);
  b.pathDurationMax = 1;

  // allocs
  var rect = Rect.alloc();
  var range = CellRange.alloc();
  var hitEvent = WorldEvent.alloc();
  var xEvent = WorldEvent.alloc();
  var yEvent = WorldEvent.alloc();

  // The hitEvent will always be the earliest hit, because every time a hit is found,
  // the body's pathDurationMax is ratcheted down to the hit time. So only
  // earlier hits will be discovered afterwards.
  hitEvent.time = this.now + b.pathDurationMax + 1; // effective infinity

  // Examine the body's starting cells.
  b.getBoundingRectAtTime(this.now, rect);
  this.getCellRangeForRect(rect, range);
  if (this.getRayscanHit(b, range, hitEvent)) {
    foundHit = true;
  }

  // Calc the initial grid-enter events
  xEvent.time = yEvent.time = this.now + b.pathDurationMax + 1; // effective infinity

  this.getFirstGridEvent(b, WorldEvent.TYPE_GRID_ENTER, Vec2d.X, xEvent);
  this.getFirstGridEvent(b, WorldEvent.TYPE_GRID_ENTER, Vec2d.Y, yEvent);

  // Process the earliest grid-enter event and generate the next one,
  // until they're later than the max time.
  var maxTime = this.now + b.pathDurationMax;
  var eventOut = WorldEvent.alloc();
  var tmp;
  while (xEvent.time <  maxTime || yEvent.time < maxTime) {
    if (xEvent.time < yEvent.time) {
      if (this.getRayscanHit(b, xEvent.cellRange, hitEvent)) {
        foundHit = true;
      }
      if (this.getSubsequentGridEvent(b, xEvent, eventOut)) {
        tmp = xEvent;
        xEvent = eventOut;
        eventOut = tmp;
      } else {
        // Push event out of range.
        xEvent.time = maxTime + 1;
      }
    } else {
      if (this.getRayscanHit(b, yEvent.cellRange, hitEvent)) {
        foundHit = true;
      }
      if (this.getSubsequentGridEvent(b, yEvent, eventOut)) {
        tmp = yEvent;
        yEvent = eventOut;
        eventOut = tmp;
      } else {
        // Push event out of range.
        yEvent.time = maxTime + 1;
      }
    }
    // lower maxTime
    maxTime = this.now + b.pathDurationMax;
  }

  if (foundHit) {
    // The request body's pathId is 0, so take the non-zero one.
    resp.pathId = hitEvent.pathId0 || hitEvent.pathId1;
    resp.timeOffset = hitEvent.time - this.now;
    resp.collisionVec.set(hitEvent.collisionVec);
  }
  rect.free();
  range.free();
  hitEvent.free();
  xEvent.free();
  yEvent.free();
  return foundHit;
};

/**
 * Gets the earliest hit between a Body and all the bodies in a CellRange.
 * Side effect: The input body's pathDurationMax will shrink to the hit time.
 * @param {Body} body
 * @param {CellRange} range
 * @param {WorldEvent} eventOut
 * @returns {?WorldEvent} eventOut if there was a hit, or null otherwise.
 */
World.prototype.getRayscanHit = function(body, range, eventOut) {
  var retval = null;
  for (var iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (var ix = range.p0.x; ix <= range.p1.x; ix++) {
      var cell = this.getCell(ix, iy);
      if (cell) {
        var hitGroups = this.groupHitsGroups[body.hitGroup];
        for (var gi = 0; gi < hitGroups.length; gi++) {
          var otherGroup = hitGroups[gi];
          var pathIdSet = cell.getPathIdsForGroup(otherGroup);
          var pathIdArray = pathIdSet.vals;
          for (var i = 0; i < pathIdArray.length;) {
            var pathId = pathIdArray[i];
            var otherBody = this.paths[pathId];
            if (otherBody && otherBody.pathId == pathId) {
              if (!this.scannedBodyIds.contains(otherBody.id)) {
                this.scannedBodyIds.put(otherBody.id);
                otherBody.freezeAtTime(this.now);
                if (this.hitDetector.calcHit(this.now, body, otherBody, eventOut)) {
                  retval = eventOut;
                  // Tighten the duration max. There's no point in looking for later hits, just earlier ones.
                  // (This is OK for rayscans, but never do it for other bodies.)
                  body.pathDurationMax = eventOut.time - this.now;
                }
                otherBody.unfreeze();
              }
              i++;
            } else {
              pathIdSet.removeIndex(i);
            }
          }
        }
      }
    }
  }
  return retval;
};

/**
 * Gets the instantaneous overlaps of a body with the objects in the world, at world.now.
 * Takes the body's hitGroup into account, but not its path duration, since this is instantaneous.
 * @param {Body} body  the query, as a Body.
 * @return {Array.<String>} body IDs
 */
World.prototype.getBodyOverlaps = function(body) {
  var retval = [];
  this.validateBodies();
  this.scannedBodyIds.reset();
  var brect = this.getPaddedBodyBoundingRect(body, this.now, Rect.alloc());
  var range = this.getCellRangeForRect(brect, CellRange.alloc());
  for (var iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (var ix = range.p0.x; ix <= range.p1.x; ix++) {
      var cell = this.getCell(ix, iy);
      if (cell) {
        var hitGroups = this.groupHitsGroups[body.hitGroup];
        for (var gi = 0; gi < hitGroups.length; gi++) {
          var otherGroup = hitGroups[gi];
          var pathIdSet = cell.getPathIdsForGroup(otherGroup);
          var pathIdArray = pathIdSet.vals;
          for (var pi = 0; pi < pathIdArray.length;) {
            var pathId = pathIdArray[pi];
            var otherBody = this.paths[pathId];
            if (otherBody && otherBody.pathId == pathId) {
              if (!this.scannedBodyIds.contains(otherBody.id)) {
                this.scannedBodyIds.put(otherBody.id);
                if (OverlapDetector.isBodyOverlappingBodyAtTime(body, otherBody, this.now)) {
                  retval.push(otherBody.id);
                }
              }
              pi++;
            } else {
              // opportunistically erase obsolete path from cell
              pathIdSet.removeIndex(pi);
            }
          }
        }
      }
    }
  }
  brect.free();
  range.free();
  return retval;
};


/**
 * Finds all the cells overlapping the circle, and adds their IDs to the objSet.
 * @param {ObjSet} objSet
 * @param {Circle} circle
 * @return {ObjSet}
 */
World.prototype.addCellIdsOverlappingCircle = function(objSet, circle) {
  this.validateBodies();
  var brect = circle.getBoundingRect(Rect.alloc());
  var range = this.getCellRangeForRect(brect, CellRange.alloc());
  for (var iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (var ix = range.p0.x; ix <= range.p1.x; ix++) {
      var cell = this.getCell(ix, iy);
      if (cell) {
        objSet.put(this.gridIndexForCellCoords(ix, iy));
      }
    }
  }
  brect.free();
  range.free();
  return objSet;
};

/**
 * Adds all the spirit IDs that are in a given cell and collison groupNum. This does not call validateBodies,
 * because that wrecks performance...?
 * @param {ObjSet} spiritIdSet
 * @param cellId
 * @param groupNum
 * @returns {ObjSet}
 */
World.prototype.addSpiritIdsInCellAndGroup = function(spiritIdSet, cellId, groupNum) {
  var cell = this.grid[cellId];
  if (cell) {
    var pathIdSet = cell.getPathIdsForGroup(groupNum);
    var pathIdArray = pathIdSet.vals;
    for (var pi = 0; pi < pathIdArray.length;) {
      var pathId = pathIdArray[pi];
      var body = this.paths[pathId];
      if (body && body.pathId == pathId) {
        var spirit = this.spirits[body.spiritId];
        if (spirit) {
          spiritIdSet.put(spirit.id);
        }
        pi++;
      } else {
        // opportunistically erase obsolete path from cell
        pathIdSet.removeIndex(pi);
      }
    }
  }
  return spiritIdSet;
};

World.prototype.getPaddedBodyBoundingRect = function(body, time, rectOut) {
  return body.getBoundingRectAtTime(time, rectOut).pad(this.cellSize * World.BRECT_FUDGE_FACTOR)
};

World.prototype.unload = function() {
  for (var spiritId in this.spirits) {
    this.removeSpiritId(spiritId);
  }
  for (var bodyId in this.bodies) {
    this.removeBodyId(bodyId);
  }
  this.queue.clear();
};

World.prototype.getQueueAsJson = function() {
  var json = [];
  for (var e = this.queue.getFirst(); e; e = e.next[0]) {
    json.push(e.toJSON());
  }
  return json;
};


//////////////////////////
// Support for undo/redo
//////////////////////////

World.prototype.setChangeRecordingEnabled = function(enabled) {
  this.changeRecordingEnabled = enabled;
};

World.prototype.startRecordingChanges = function() {
  if (this.isChangeRecordingStarted()) throw Error('change recording was already started');
  this.bodyBefores = {};
  this.spiritBefores = {};
  this.nowBefore = this.now;
  this.queueBefore = this.getQueueAsJson();
};

World.prototype.pauseRecordingChanges = function() {
  this.changeRecordingPaused++;
};

World.prototype.resumeRecordingChanges = function() {
  this.changeRecordingPaused--;
};

World.prototype.stopRecordingChanges = function() {
  if (!this.isChangeRecordingStarted()) throw Error('change recording was not started');
  var changes = [];
  for (var bodyId in this.bodyBefores) {
    var bodyBefore = this.bodyBefores[bodyId];
    var body = this.bodies[bodyId];
    var bodyAfter = body ? body.toJSON() : null;
    // make sure it's not a no-op, like an add and a delete in the same changelist
    if (bodyBefore || bodyAfter) {
      changes.push(new ChangeOp(World.ChangeType.BODY, bodyId, bodyBefore, bodyAfter));
    }
  }
  for (var spiritId in this.spiritBefores) {
    var spiritBefore = this.spiritBefores[spiritId];
    var spirit = this.spirits[spiritId];
    var spiritAfter = spirit ? spirit.toJSON() : null;
    // make sure it's not a no-op, like an add and a delete in the same changelist
    if (spiritBefore || spiritAfter) {
      changes.push(new ChangeOp(World.ChangeType.SPIRIT, spiritId, spiritBefore, spiritAfter));
    }
  }
  if (this.nowBefore != this.now) {
    changes.push(new ChangeOp(World.ChangeType.NOW, 0, this.nowBefore, this.now));
  }
  var queueAfter = this.getQueueAsJson();
  if (!this.queueJsonsEqual(this.queueBefore, queueAfter)) {
    changes.push(new ChangeOp(World.ChangeType.QUEUE, 0, this.queueBefore, queueAfter));
  }

  this.bodyBefores = null;
  this.spiritBefores = null;
  this.nowBefore = this.now;
  this.queueBefore = null;
  return changes;
};

World.prototype.queueJsonsEqual = function(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) != JSON.stringify(b[i])) return false;
  }
  return true;
};

World.prototype.isChangeRecordingStarted = function() {
  return this.changeRecordingEnabled && this.bodyBefores && this.spiritBefores;
};

World.prototype.applyChanges = function(changes) {
  for (var i = 0; i < changes.length; i++) {
    this.applyChange(changes[i]);
  }
};

World.prototype.applyChange = function(change) {
  switch (change.type) {
    case World.ChangeType.BODY:
      var afterBody = change.afterState ? new Body().setFromJSON(change.afterState) : null;
      if (change.beforeState == null) {
        this.loadBody(afterBody);
      } else if (!afterBody) {
        this.removeBodyId(change.id)
      } else {
        // do a change as a remove and an add
        this.removeBodyId(change.id);
        this.loadBody(afterBody);
      }
      break;
    case World.ChangeType.SPIRIT:
      var afterSpirit = change.afterState ? this.createSpiritFromJson(change.afterState) : null;
      if (change.beforeState == null) {
        this.loadSpirit(afterSpirit);
      } else if (!afterSpirit) {
        this.removeSpiritId(change.id)
      } else {
        // do a change as a remove and an add
        this.removeSpiritId(change.id);
        this.loadSpirit(afterSpirit);
      }
      break;
    case World.ChangeType.NOW:
      this.now = change.afterState;
      break;
    case World.ChangeType.QUEUE:
      // replace the whole thing, since it's easy and not too expensive
      this.queue.clear();
      for (var i = 0; change.afterState && i < change.afterState.length; i++) {
        this.queue.add(new WorldEvent().setFromJSON(change.afterState[i]));
      }
      break;
  }
};

World.prototype.createSpiritFromJson = function(json) {
  return this.spiritFactory.createSpiritFromJson(json);
};

World.prototype.onBeforeBodyChange = function(body) {
  this.maybeRecordBodyBefore(body.id, body);
};

World.prototype.onBeforeSpiritChange = function(spirit) {
  this.maybeRecordSpiritBefore(spirit.id, spirit);
};

World.prototype.maybeRecordBodyBefore = function(id, body) {
  if (this.isChangeRecordingStarted() && !this.changeRecordingPaused && !(id in this.bodyBefores)) {
    this.bodyBefores[id] = body ? body.toJSON() : null;
  }
};

World.prototype.maybeRecordSpiritBefore = function(id, spirit) {
  if (this.isChangeRecordingStarted() && !this.changeRecordingPaused && !(id in this.spiritBefores)) {
    this.spiritBefores[id] = spirit ? spirit.toJSON() : null;
  }
};
