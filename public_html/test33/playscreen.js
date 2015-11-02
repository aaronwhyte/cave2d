/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
  this.trackball = new MultiTrackball()
      .addTrackball(new MouseTrackball())
      .addTrackball(new TouchTrackball());
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();

  // for sound throttling
  this.hitsThisFrame = 0;

  this.world = null;
  this.tiles = null;

  this.cursorPos = new Vec2d();
  this.cursorVel = new Vec2d();
  this.cursorStamp = null; // it'll be a ring
  this.cursorColorVector = new Vec4();
  this.cursorRad = 10;
  this.cursorModelMatrix = new Matrix44();
  this.cursorMode = PlayScreen.CursorMode.FLOOR;
  this.cursorBody = this.createCursorBody();
  this.indicatedBodyId = null;

  this.cameraPos = new Vec2d();
  this.minCameraDist = 60;
  this.maxCameraDist = 100;
  this.viewDist = 500;
  this.pixelSize = 4;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);

  this.mat44 = new Matrix44();
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.WORLD_CELL_SIZE = 4 * 32;

PlayScreen.Group = {
  EMPTY: 0,
  WALL: 1,
  ROCK: 2,
  CURSOR: 3
};

PlayScreen.Terrain = {
  WALL: 0,
  FLOOR: 1,
  MIXED: 2
};

PlayScreen.CursorMode = {
  WALL: 0,
  FLOOR: 1,
  OBJECT: 2
};

PlayScreen.prototype.onPointerDown = function(pageX, pageY) {
  if (Vec2d.distance(pageX, pageY, this.canvas.width/2, 0) < Math.min(this.canvas.height, this.canvas.width)/4) {
    this.pauseGame();
  } else {
    this.controller.requestPointerLock();
  }
};

PlayScreen.prototype.onSpaceDown = function() {
  this.pauseGame();
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    this.trackball.startListening();
  } else {
    this.trackball.stopListening();
  }
  this.listening = listen;
};

PlayScreen.prototype.pauseGame = function() {
  var freq0 = 3000;
  var freq1 = 30;
  var delay = 0;
  var attack = 0.05;
  var sustain = 0.15;
  var decay = 0.01;
  this.sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
  this.controller.exitPointerLock();
  this.controller.gotoScreen(Test33.SCREEN_PAUSE);
};

PlayScreen.prototype.lazyInit = function() {
  if (!this.levelStamps) {
    this.initPermStamps();
  }
  if (!this.world) {
    this.initWorld();
  }
};

PlayScreen.prototype.initPermStamps = function() {
  this.levelStamps = [];

  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cubeStamp);

  var circleModel = RigidModel.createCircleMesh(4);
  this.circleStamp = circleModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.circleStamp);

  var thickness = 0.1;
  var innerRadius = 1 - thickness;
  var cursorModel = RigidModel.createRingMesh(5, innerRadius);
  cursorModel.transformPositions(new Matrix44().toScaleOpXYZ(1/innerRadius, 1/innerRadius, 1));
  this.cursorStamp = cursorModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cursorStamp);
};

PlayScreen.prototype.initWorld = function() {
  this.lastPathRefreshTime = -Infinity;
  var groupCount = Object.keys(PlayScreen.Group).length;
  this.world = new World(PlayScreen.WORLD_CELL_SIZE, groupCount, [
    [PlayScreen.Group.EMPTY, PlayScreen.Group.EMPTY],
    [PlayScreen.Group.ROCK, PlayScreen.Group.WALL],
    [PlayScreen.Group.ROCK, PlayScreen.Group.ROCK],
    [PlayScreen.Group.CURSOR, PlayScreen.Group.WALL],
    [PlayScreen.Group.CURSOR, PlayScreen.Group.ROCK]
  ]);
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.8;
  for (var i = 0; i < 30; i++) {
    this.initBoulder(new Vec2d(400 * (Math.random()-0.5), 400 * (Math.random()-0.5)), 30 * (Math.random() + 0.5));
  }
  this.initWalls();
};

PlayScreen.prototype.initBoulder = function(pos, rad) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = Infinity;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.circleStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(Math.random(), Math.random(), Math.random());
  return spiritId;
};

PlayScreen.prototype.createCursorBody = function() {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = PlayScreen.Group.CURSOR;
  return b;
};

PlayScreen.prototype.initWalls = function() {
  this.bitGrid = new BitGrid(this.pixelSize);
  var rad = 100;
  this.bitGrid.drawPill(new Segment(new Vec2d(-rad, -rad*1.2), new Vec2d(rad, -rad*1.2)), rad, 1);

  this.bitGrid.drawPill(new Segment(new Vec2d(-rad * 2.15, rad), new Vec2d(-rad * 2.15, rad)), rad*1.2, 1);
  this.bitGrid.drawPill(new Segment(new Vec2d(rad * 2.15, rad), new Vec2d(rad * 2.15, rad)), rad*1.2, 1);

  this.bitGrid.drawPill(new Segment(new Vec2d(-rad * 2.15, rad), new Vec2d(-rad * 2.15, rad)), rad*0.5, 0);
  this.bitGrid.drawPill(new Segment(new Vec2d(rad * 2.15, rad), new Vec2d(rad * 2.15, rad)), rad*0.9, 0);

  this.tiles = {};
  var changedCellIds = this.bitGrid.flushChangedCellIds();
  for (var i = 0; i < changedCellIds.length; i++) {
    this.changeTerrain(changedCellIds[i]);
  }
};

PlayScreen.prototype.digTerrainAtPos = function(pos) {
  this.bitGrid.drawPill(new Segment(pos, pos), 15, 1);
  var changedCellIds = this.bitGrid.flushChangedCellIds();
  for (var i = 0; i < changedCellIds.length; i++) {
    this.changeTerrain(changedCellIds[i]);
  }
};

/**
 * The cell at the cellId definitely changes, so unload it and reload it.
 * Make sure the four cardinal neighbors are also loaded.
 * @param cellId
 */
PlayScreen.prototype.changeTerrain = function(cellId) {
  var center = Vec2d.alloc();
  this.bitGrid.cellIdToIndexVec(cellId, center);
  this.loadCellXY(center.x - 1, center.y);
  this.loadCellXY(center.x + 1, center.y);
  this.loadCellXY(center.x, center.y - 1);
  this.loadCellXY(center.x, center.y + 1);
  this.unloadCellXY(center.x, center.y);
  this.loadCellXY(center.x, center.y);
  center.free();
};

PlayScreen.prototype.loadCellXY = function(cx, cy) {
  var cellId = this.bitGrid.getCellIdAtIndexXY(cx, cy);
  var tile = this.tiles[cellId];
  if (!tile) {
    this.tiles[cellId] = tile = {
      cellId: cellId,
      stamp: null,
      bodyIds: null
    };
  }
  if (!tile.bodyIds) {
    tile.bodyIds = [];
    // Create wall bodies and remember their IDs.
    var rects = this.bitGrid.getRectsOfColorForCellId(0, cellId);
    for (var r = 0; r < rects.length; r++) {
      var rect = rects[r];
      var body = this.createWallBody(rect);
      tile.bodyIds.push(this.world.addBody(body));
    }
  }
  // TODO don't repeat stamp for solid walls
  if (!tile.stamp) {
    if (!rects) rects = this.bitGrid.getRectsOfColorForCellId(0, cellId);
    tile.stamp = this.createTileStamp(rects);
  }
};

PlayScreen.prototype.unloadCellXY = function(cx, cy) {
  this.unloadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

PlayScreen.prototype.unloadCellId = function(cellId) {
  var tile = this.tiles[cellId];
  if (!tile) return;
  if (tile.stamp) {
    tile.stamp.dispose(this.renderer.gl);
    tile.stamp = null;
  }
  if (tile.bodyIds) {
    for (var i = 0; i < tile.bodyIds.length; i++) {
      var id = tile.bodyIds[i];
      this.world.removeBodyId(id);
    }
    tile.bodyIds = null;
  }
};

/**
 * Creates a body, but does not add it to the world.
 */
PlayScreen.prototype.createWallBody = function(rect) {
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosAtTime(rect.pos, this.world.now);
  b.rectRad.set(rect.rad);
  b.hitGroup = PlayScreen.Group.WALL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  return b;
};

PlayScreen.prototype.createTileStamp = function(rects) {
  var model = new RigidModel();
  for (var i = 0; i < rects.length; i++) {
    model.addRigidModel(this.createWallModel(rects[i]));
  }
  return model.createModelStamp(this.renderer.gl);
};

PlayScreen.prototype.createWallModel = function(rect) {
  var transformation, wallModel;
  transformation = new Matrix44()
      .toTranslateOpXYZ(rect.pos.x, rect.pos.y, 0)
      .multiply(new Matrix44().toScaleOpXYZ(rect.rad.x, rect.rad.y, 1));
  wallModel = RigidModel.createSquare().transformPositions(transformation);
  wallModel.setColorRGB(0.6, 0.5, 0.3);
  return wallModel;
};

PlayScreen.prototype.handleInput = function() {
  if (!this.world) return;

  var newVel = Vec2d.alloc();
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    var sensitivity = 4;
    this.movement.scale(sensitivity);
    newVel.setXY(this.movement.x, -this.movement.y);

    var accel = Vec2d.alloc().set(newVel).subtract(this.cursorVel);
    var maxAccel = 10;
    // If it's over 1, then use a square root to lower it.
    // (If it's less than 1, then sqrt will make it bigger, so don't bother.)
    var mag = accel.magnitude();
    if (mag > 1) {
      accel.scaleToLength(Math.sqrt(mag));
    }
    accel.clipToMaxLength(maxAccel);
    newVel.set(this.cursorVel).add(accel);
    this.cursorVel.set(newVel);
    accel.free();
  }
  newVel.free();
  this.trackball.reset();
  this.cursorPos.add(this.cursorVel);
  this.cursorVel.scale(0.95);

  // TODO if (trigger is up) {
  this.doCursorHoverScan();
};

PlayScreen.prototype.doCursorHoverScan = function() {
  this.cursorBody.setPosAtTime(this.cursorPos, this.world.now);
  var i, hitBody, overlapBodyIds;
  this.indicatedBodyId = null;

  // center pinpoint check
  this.cursorBody.rad = 0;
  overlapBodyIds = this.world.getOverlaps(this.cursorBody);
  var lowestArea = Infinity;
  var smallestBody = null;
  var overWall = false;
  for (i = 0; i < overlapBodyIds.length; i++) {
    hitBody = this.world.bodies[overlapBodyIds[i]];
    if (hitBody) {
      if (hitBody.hitGroup == PlayScreen.Group.WALL) {
        overWall = true;
      } else if (hitBody.getArea() < lowestArea) {
        lowestArea = hitBody.getArea();
        smallestBody = hitBody;
      }
    }
  }
  if (smallestBody) {
    this.indicatedBodyId = smallestBody.id;
    this.cursorMode = PlayScreen.CursorMode.OBJECT;
    return;
  }

  // full cursor radius check for objects
  this.cursorBody.rad = this.cursorRad;
  overlapBodyIds = this.world.getOverlaps(this.cursorBody);
  var lowestSurfaceDist = Infinity;
  for (i = 0; i < overlapBodyIds.length; i++) {
    hitBody = this.world.bodies[overlapBodyIds[i]];
    if (hitBody && hitBody.hitGroup != PlayScreen.Group.WALL) {
      // TODO: var surfaceDist = hitBody.surfaceDistToPoint(this.cursorPos);
      var surfaceDist = this.getBodyPos(hitBody).distance(this.cursorPos);
      if (surfaceDist < lowestSurfaceDist) {
        lowestSurfaceDist = surfaceDist;
        this.indicatedBodyId = hitBody.id;
      }
    }
  }
  if (this.indicatedBodyId) {
    this.cursorMode = PlayScreen.CursorMode.OBJECT;
  } else if (overWall) {
    this.cursorMode = PlayScreen.CursorMode.WALL;
  } else {
    this.cursorMode = PlayScreen.CursorMode.FLOOR;
  }
};

PlayScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

PlayScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

PlayScreen.prototype.updateViewMatrix = function() {
  var cameraDist = this.cursorPos.distance(this.cameraPos);
  if (cameraDist > this.minCameraDist) {
    var temp = Vec2d.alloc();
    temp.set(this.cursorPos)
        .subtract(this.cameraPos)
        .scaleToLength((cameraDist-this.minCameraDist) * 0.1)
        .add(this.cameraPos);
    this.cameraPos.set(temp);
    cameraDist = this.cursorPos.distance(this.cameraPos);
    if (cameraDist > this.maxCameraDist) {
      temp.set(this.cursorPos)
          .subtract(this.cameraPos)
          .scaleToLength(cameraDist - this.maxCameraDist)
          .add(this.cameraPos);
      this.cameraPos.set(temp);
    }
    temp.free();
  }

  // scale
  this.viewMatrix.toIdentity();
  var ratio = (this.canvas.height + this.canvas.width) / (2 + this.viewDist);
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              ratio / this.canvas.width,
              ratio / this.canvas.height,
          0.2));

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -this.cameraPos.x,
      -this.cameraPos.y,
      0));

  this.renderer.setViewMatrix(this.viewMatrix);
};

PlayScreen.prototype.drawScene = function() {
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  if (this.tiles) {
    this.renderer
        .setColorVector(this.levelColorVector)
        .setModelMatrix(this.levelModelMatrix);
    var cx = Math.round((this.cameraPos.x - this.bitGrid.cellWorldSize/2) / (this.bitGrid.cellWorldSize));
    var cy = Math.round((this.cameraPos.y - this.bitGrid.cellWorldSize/2) / (this.bitGrid.cellWorldSize));
    var cellRad = 3;
    for (var dy = -cellRad; dy <= cellRad; dy++) {
      for (var dx = -cellRad; dx <= cellRad; dx++) {
        this.loadCellXY(cx + dx, cy + dy);
        var cellId = this.bitGrid.getCellIdAtIndexXY(cx + dx, cy + dy);
        var tile = this.tiles[cellId];
        if (tile && tile.stamp) {
          this.renderer
              .setStamp(tile.stamp)
              .drawStamp();
        }
      }
    }
  }

  // draw cursor
  this.renderer
      .setStamp(this.cursorStamp)
      .setColorVector(this.getCursorColorVector());
  this.cursorModelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(this.cursorRad, this.cursorRad, 1));
  this.renderer.setModelMatrix(this.cursorModelMatrix);
  this.renderer.drawStamp();

  // body indicator
  var body = this.world.bodies[this.indicatedBodyId];
  if (body) {
    var bodyPos = this.getBodyPos(body);
    this.renderer
        .setStamp(this.cursorStamp)
        .setColorVector(this.getCursorColorVector());
    //var edge = Math.sqrt(body.getArea()) / 2;
    this.cursorModelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.99))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));
    this.renderer.setModelMatrix(this.cursorModelMatrix);
    this.renderer.drawStamp();
  }

  if (this.restarting) {
    this.controller.restart();
    this.restarting = false;
  } else {
    // Animate whenever this thing draws.
    this.controller.requestAnimation();
  }
};

PlayScreen.prototype.getCursorColorVector = function() {
  switch(this.cursorMode) {
    case PlayScreen.CursorMode.FLOOR:
      this.cursorColorVector.setXYZ(0.4, 0.4, 0.4);
      break;
    case PlayScreen.CursorMode.WALL:
      this.cursorColorVector.setXYZ(1, 1, 0);
      break;
    case PlayScreen.CursorMode.OBJECT:
      this.cursorColorVector.setXYZ(1, 1, 1);
      break;
  }
  return this.cursorColorVector;
};

PlayScreen.prototype.unloadLevel = function() {
  if (this.tiles) {
    for (var cellId in this.tiles) {
      this.unloadCellId(cellId);
    }
    this.tiles = null;
  }
  if (this.world) {
    for (var spiritId in this.world.spirits) {
      var s = this.world.spirits[spiritId];
      var b = this.world.bodies[s.bodyId];
      this.world.removeBodyId(b.id);
      this.world.removeSpiritId(spiritId);
    }
    this.world = null;
  }
  this.cursorPos.reset();
  this.cursorVel.reset();
  this.cameraPos.reset();
};

PlayScreen.prototype.getBodyPos = function(body) {
  return body.getPosAtTime(this.world.now, this.vec2d);
};
