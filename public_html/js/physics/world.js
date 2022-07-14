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
  for (let i = 0; i < this.groupPairs.length; i++) {
    let pair = this.groupPairs[i];
    for (let a = 0; a < 2; a++) {
      let b = (a + 1) % 2;
      let list = this.groupHitsGroups[pair[a]];
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

  // Groups whose objects never move
  this.stationaryGroups = new Set();

  // Holds IDs of body objects that need to have their paths processed by the collider
  // before time can move forward. This includes newly-added bodies.
  // Bodies can be invalid for a time, so that they can be manipulated while time is standing still,
  // without having to recompute collisions every time.
  this.invalidBodyIds = new Set();

  this.nextId = 10;

  this.grid = {};

  this.queue = new SkipQueue(World.SKIP_QUEUE_BASE,
      SkipQueue.getRecommendedMaxLevel(100, World.SKIP_QUEUE_BASE));

  this.now = 1;

  this.hitDetector = new HitDetector();
  this.hitTimePadding = 0.001;

  // cache for rayscans and overlap scans.
  this.scannedBodyIds = new Set();

  // If you want this enabled, do it as part of world creation
  this.changeRecordingEnabled = false;

  // This is counted, so nesting can work
  this.changeRecordingPaused = 0;

  this.bodyBefores = null;
  this.spiritBefores = null;
  this.nowBefore = null;

  // temps that I don't want to alloc and free/reset a lot
  this.tempRect = new Rect();
  this.tempCellRange = new CellRange();

  this.rayscanBody = new Body();
  this.rayscanHitEvent = new WorldEvent();
  this.rayscanXEvent = new WorldEvent();
  this.rayscanYEvent = new WorldEvent();
  this.rayscanEventOut = new WorldEvent();

  // stats
  this.addBodyCount = 0;
  this.bodyCalcHitCount = 0;
  this.hitEnqueuedCount = 0;
  this.addTimeoutCount = 0;
  this.enterOrExitEnqueuedCount = 0;
  this.rayscanCount = 0;
  this.rayscanCalcHitCount = 0;
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

World.prototype.addStationaryGroup = function(group) {
  this.stationaryGroups.add(group);
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
  let index = this.gridIndexForCellCoords(ix, iy);
  let cell = this.grid[index];
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
  if (spirit.maybeWake) {
    let body = this.bodies[spirit.bodyId];
    if (body) {
      body.setWakeListener(spirit);
    }
  }
  if (spirit.startTimeouts) spirit.startTimeouts();
};

/**
 * If the spirit is found it is removed, and if it has a free() method, it is freed too.
 * @param id
 */
World.prototype.removeSpiritId = function(id) {
  let spirit = this.spirits[id];
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
  this.addBodyCount++;
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
  let spirit = this.spirits[body.spiritId];
  if (spirit && spirit.maybeWake) {
    body.setWakeListener(spirit);
  }
};

/**
 * Removes the body from the world, and frees the body instance back into the class pool.
 * @param bodyId
 */
World.prototype.removeBodyId = function(bodyId) {
  let body = this.bodies[bodyId];
  if (body) {
    this.maybeRecordBodyBefore(bodyId, body);
    let rect = this.tempRect;
    this.getPaddedBodyBoundingRect(body, this.now, rect);
    let range = this.tempCellRange;
    this.getCellRangeForRect(rect, range);
    this.removeBodyFromCellRange(body, range);
    delete this.bodies[body.id];
    delete this.paths[body.pathId];
    this.invalidBodyIds.delete(body.id);
    body.free();
  } else {
    console.log("couldn't find or remove bodyId " + bodyId);
  }
};

World.prototype.removeBodyFromCellRange = function(body, cellRange) {
  for (let iy = cellRange.p0.y; iy <= cellRange.p1.y; iy++) {
    for (let ix = cellRange.p0.x; ix <= cellRange.p1.x; ix++) {
      let cell = this.getCell(ix, iy);
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
  let body = this.paths[pathId];
  if (body && body.pathId !== pathId) {
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
  for (let bodyId of this.invalidBodyIds.keys()) {
    let body = this.bodies[bodyId];
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
  this.invalidBodyIds.clear();
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
  let brect = this.getPaddedBodyBoundingRect(body, this.now, this.tempRect);
  let range = this.getCellRangeForRect(brect, this.tempCellRange);
  for (let iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (let ix = range.p0.x; ix <= range.p1.x; ix++) {
      let cell = this.getCell(ix, iy);
      if (!cell) {
        cell = this.setCell(Cell.alloc(this.getGroupCount()), ix, iy);
      }
      this.addPathToCell(body, cell);
    }
  }
};

World.prototype.getGroupCount = function() {
  return this.groupCount;
};

World.prototype.addPathToCell = function(body, cell) {
  let nextEvent = WorldEvent.alloc();
  let group = body.hitGroup;
  let stationary = body.vel.isZero();

  let hitGroups = this.groupHitsGroups[group];
  for (let gi = 0; gi < hitGroups.length; gi++) {
    let otherGroup = hitGroups[gi];
    if (stationary && this.stationaryGroups.has(otherGroup)) {
      // Optimization: Stationary objects can't hit stationary objects.
      continue;
    }
    let pathIdSet = cell.getPathIdsForGroup(otherGroup);
    for (let pathId of pathIdSet.keys()) {
      let otherBody = this.paths[pathId];
      if (otherBody && otherBody.pathId === pathId) {
        this.bodyCalcHitCount++;
        let hitEvent = this.hitDetector.calcHit(this.now, body, otherBody, nextEvent);
        if (hitEvent && hitEvent.time < Infinity) {
          // Pad the collision time to prevent numerical-challenge interpenetration.
          hitEvent.time = Math.max(hitEvent.time - this.hitTimePadding, this.now);
          // Add the existing event and allocate the next one.
          this.hitEnqueuedCount++;
          this.queue.add(hitEvent);
          nextEvent = WorldEvent.alloc();
        }
      } else {
        pathIdSet.delete(pathId);
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
  let v = body.vel;
  if (!v[axis]) return null;
  let perp = Vec2d.otherAxis(axis);

  // Calculate the leading/trailing point "p" on the moving bounding rect.
  let rect = body.getBoundingRectAtTime(this.now, this.tempRect);
  let vSign = Vec2d.alloc().set(body.vel).sign();

  let p = Vec2d.alloc().set(rect.rad).multiply(vSign);
  if (eventType === WorldEvent.TYPE_GRID_EXIT) {
    p.scale(-1);
  }
  p.add(rect.pos);

  // c is the center of the cell that p is in.
  let c = Vec2d.alloc().set(p).roundToGrid(this.cellSize);

  // Calculate crossing times
  let e = null;
  let t = this.now + (c[axis] + 0.5 * vSign[axis] * this.cellSize - p[axis]) / v[axis];
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
  let event = WorldEvent.alloc();
  if (this.getFirstGridEvent(body, eventType, axis, event)) {
    this.enterOrExitEnqueuedCount++;
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
  let axis = prevEvent.axis;
  let eventType = prevEvent.type;
  let v = body.vel;
  if (!v[axis]) return null;
  let perp = Vec2d.otherAxis(axis);

  let vSign = Vec2d.alloc().set(v).sign();
  let nextCellIndex = prevEvent.cellRange.p0[axis] + vSign[axis];
  // What time will the point reach that cell index?
  let rad = vSign[axis] * (body.shape === Body.Shape.CIRCLE ? body.rad : body.rectRad[axis]);
  let dest;
  if (eventType === WorldEvent.TYPE_GRID_ENTER) {
    dest = (nextCellIndex - 0.5 * vSign[axis]) * this.cellSize - rad;
  } else {
    dest = (nextCellIndex + 0.5 * vSign[axis]) * this.cellSize + rad;
  }
  let t = body.pathStartTime + (dest - body.pathStartPos[axis]) / v[axis];
  let e = null;
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
    let rect = this.tempRect;
    this.getPaddedBodyBoundingRect(body, t, rect);
    e.cellRange.p0[perp] = this.cellCoord(rect.pos[perp] - rect.rad[perp]);
    e.cellRange.p1[perp] = this.cellCoord(rect.pos[perp] + rect.rad[perp]);
  }
  vSign.free();
  return e;
};

World.prototype.addSubsequentGridEvent = function(body, prevEvent) {
  let event = WorldEvent.alloc();
  if (this.getSubsequentGridEvent(body, prevEvent, event)) {
    this.enterOrExitEnqueuedCount++;
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
  this.processNextEventWithoutFreeing().free();
};

/**
 * Removes the next event from the queue, and advances the world time to the event time,
 * optionally doing some internal processing.
 */
World.prototype.processNextEventWithoutFreeing = function() {
  this.validateBodies();
  let e = this.queue.removeFirst();
  this.now = e.time;

  if (e.type === WorldEvent.TYPE_GRID_ENTER) {
    let body = this.paths[e.pathId];
    if (body && body.pathId === e.pathId) {
      this.addSubsequentGridEvent(body, e);
      for (let iy = e.cellRange.p0.y; iy <= e.cellRange.p1.y; iy++) {
        for (let ix = e.cellRange.p0.x; ix <= e.cellRange.p1.x; ix++) {
          let cell = this.getCell(ix, iy);
          if (!cell) {
            cell = this.setCell(Cell.alloc(this.getGroupCount()), ix, iy);
          }
          this.addPathToCell(body, cell);
        }
      }
    }

  } else if (e.type === WorldEvent.TYPE_GRID_EXIT) {
    let body = this.paths[e.pathId];
    if (body && body.pathId === e.pathId) {
      this.addSubsequentGridEvent(body, e);
      this.removeBodyFromCellRange(body, e.cellRange);
    }

  } else if (e.type === WorldEvent.TYPE_HIT) {
    // Let the game handle it.

  } else if (e.type === WorldEvent.TYPE_TIMEOUT) {
    let spirit = this.spirits[e.spiritId];
    if (spirit) {
      spirit.onTimeout(this, e.timeoutVal);
    }
  }
  return e;
};

World.prototype.addTimeout = function(time, spiritId, timeoutVal) {
  this.addTimeoutCount++;
  let e = WorldEvent.alloc();
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
  this.rayscanCount++;
  this.validateBodies();
  this.scannedBodyIds.clear();
  let foundHit = false;

  // allocs
  let rect = this.tempRect;
  let range = this.tempCellRange;
  let hitEvent = this.rayscanHitEvent;
  let xEvent = this.rayscanXEvent;
  let yEvent = this.rayscanYEvent;
  // Create a Body based on the ScanRequest.
  let b = this.rayscanBody;
  b.hitGroup = req.hitGroup;
  b.setPosAtTime(req.pos, this.now);
  b.vel.set(req.vel);
  b.shape = req.shape;
  b.rad = req.rad;
  b.rectRad.set(req.rectRad);
  b.pathDurationMax = 1;

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
  let maxTime = this.now + b.pathDurationMax;
  let eventOut = this.rayscanEventOut;
  let tmp;
  while (xEvent.time < maxTime || yEvent.time < maxTime) {
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
  let retval = null;
  for (let iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (let ix = range.p0.x; ix <= range.p1.x; ix++) {
      let cell = this.getCell(ix, iy);
      if (cell) {
        let hitGroups = this.groupHitsGroups[body.hitGroup];
        for (let gi = 0; gi < hitGroups.length; gi++) {
          let otherGroup = hitGroups[gi];
          let pathIdSet = cell.getPathIdsForGroup(otherGroup);
          for (let pathId of pathIdSet.keys()) {
            let otherBody = this.paths[pathId];
            if (otherBody && otherBody.pathId === pathId) {
              if (!this.scannedBodyIds.has(otherBody.id)) {
                this.scannedBodyIds.add(otherBody.id);
                otherBody.freezeAtTime(this.now);
                this.rayscanCalcHitCount++;
                if (this.hitDetector.calcHit(this.now, body, otherBody, eventOut)) {
                  retval = eventOut;
                  // Tighten the duration max. There's no point in looking for later hits, just earlier ones.
                  // (This is OK for rayscans, but never do it for other bodies.)
                  body.pathDurationMax = eventOut.time - this.now;
                }
                otherBody.unfreeze();
              }
            } else {
              pathIdSet.delete(pathId);
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
  let retval = [];
  this.validateBodies();
  this.scannedBodyIds.clear();
  let brect = this.getPaddedBodyBoundingRect(body, this.now, this.tempRect);
  let range = this.getCellRangeForRect(brect, this.tempCellRange);
  for (let iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (let ix = range.p0.x; ix <= range.p1.x; ix++) {
      let cell = this.getCell(ix, iy);
      if (cell) {
        let hitGroups = this.groupHitsGroups[body.hitGroup];
        for (let gi = 0; gi < hitGroups.length; gi++) {
          let otherGroup = hitGroups[gi];
          let pathIdSet = cell.getPathIdsForGroup(otherGroup);
          for (let pathId of pathIdSet.keys()) {
            let otherBody = this.paths[pathId];
            if (otherBody && otherBody.pathId === pathId) {
              if (!this.scannedBodyIds.has(otherBody.id)) {
                this.scannedBodyIds.add(otherBody.id);
                if (OverlapDetector.isBodyOverlappingBodyAtTime(body, otherBody, this.now)) {
                  retval.push(otherBody.id);
                }
              }
            } else {
              // opportunistically erase obsolete path from cell
              pathIdSet.delete(pathId);
            }
          }
        }
      }
    }
  }
  return retval;
};


/**
 * Finds all the cells overlapping the circle, and adds their IDs to the objSet.
 * @param {Set} cellIdSet The set that accumulates cell IDs
 * @param {Circle} circle
 * @return {Set}
 */
World.prototype.addCellIdsOverlappingCircle = function(cellIdSet, circle) {
  let brect = circle.getBoundingRect(this.tempRect);
  let range = this.getCellRangeForRect(brect, this.tempCellRange);
  for (let iy = range.p0.y; iy <= range.p1.y; iy++) {
    for (let ix = range.p0.x; ix <= range.p1.x; ix++) {
      let cell = this.getCell(ix, iy);
      if (cell) {
        cellIdSet.add(this.gridIndexForCellCoords(ix, iy));
      }
    }
  }
  return cellIdSet;
};

/**
 * Adds all the spirit IDs that are in a given cell and collision groupNum. This does not call validateBodies,
 * because that wrecks performance...?
 * @param {Set} spiritIdSet
 * @param cellId
 * @param groupNum
 * @returns {Set}
 */
World.prototype.addSpiritIdsInCellAndGroup = function(spiritIdSet, cellId, groupNum) {
  let cell = this.grid[cellId];
  if (cell) {
    let pathIdSet = cell.getPathIdsForGroup(groupNum);
    for (let pathId of pathIdSet.keys()) {
      let body = this.paths[pathId];
      if (body && body.pathId === pathId) {
        let spirit = this.spirits[body.spiritId];
        if (spirit) {
          spiritIdSet.add(spirit.id);
        }
      } else {
        // opportunistically erase obsolete path from cell
        pathIdSet.delete(pathId);
      }
    }
  }
  return spiritIdSet;
};

World.prototype.getPaddedBodyBoundingRect = function(body, time, rectOut) {
  return body.getBoundingRectAtTime(time, rectOut).pad(this.cellSize * World.BRECT_FUDGE_FACTOR)
};

World.prototype.unload = function() {
  for (let spiritId in this.spirits) {
    this.removeSpiritId(spiritId);
  }
  for (let bodyId in this.bodies) {
    this.removeBodyId(bodyId);
  }
  this.queue.clear();
};

World.prototype.getQueueAsJson = function() {
  let json = [];
  for (let e = this.queue.getFirst(); e; e = e.next[0]) {
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
  let changes = [];
  for (let bodyId in this.bodyBefores) {
    let bodyBefore = this.bodyBefores[bodyId];
    let body = this.bodies[bodyId];
    let bodyAfter = body ? body.toJSON() : null;
    // make sure it's not a no-op, like an add and a delete in the same changelist
    if (bodyBefore || bodyAfter) {
      changes.push(new ChangeOp(World.ChangeType.BODY, bodyId, bodyBefore, bodyAfter));
    }
  }
  for (let spiritId in this.spiritBefores) {
    let spiritBefore = this.spiritBefores[spiritId];
    let spirit = this.spirits[spiritId];
    let spiritAfter = spirit ? spirit.toJSON() : null;
    // make sure it's not a no-op, like an add and a delete in the same changelist
    if (spiritBefore || spiritAfter) {
      changes.push(new ChangeOp(World.ChangeType.SPIRIT, spiritId, spiritBefore, spiritAfter));
    }
  }
  if (this.nowBefore !== this.now) {
    changes.push(new ChangeOp(World.ChangeType.NOW, 0, this.nowBefore, this.now));
  }
  let queueAfter = this.getQueueAsJson();
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
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
  }
  return true;
};

World.prototype.isChangeRecordingStarted = function() {
  return this.changeRecordingEnabled && this.bodyBefores && this.spiritBefores;
};

World.prototype.applyChanges = function(changes) {
  for (let i = 0; i < changes.length; i++) {
    this.applyChange(changes[i]);
  }
};

World.prototype.applyChange = function(change) {
  switch (change.type) {
    case World.ChangeType.BODY:
      let afterBody = change.afterState ? new Body().setFromJSON(change.afterState) : null;
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
      let afterSpirit = change.afterState ? this.createSpiritFromJson(change.afterState) : null;
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
      for (let i = 0; change.afterState && i < change.afterState.length; i++) {
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
  if (this.isChangeRecordingStarted() &&
      !this.changeRecordingPaused &&
      !(id in this.spiritBefores)) {
    this.spiritBefores[id] = spirit ? spirit.toJSON() : null;
  }
};
