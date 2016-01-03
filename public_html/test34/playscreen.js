/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);

  this.trackball = new MultiTrackball()
      .addTrackball(new MouseTrackball())
      .addTrackball(new TouchTrackball().setStartZoneFunction(function(x, y) {
        return Vec2d.distance(x, y, self.triggerPixelX, self.triggerPixelY) > self.triggerPixelRad;
      }))
      .addTrackball(new KeyTrackball(
          new KeyStick().setUpRightDownLeftByName(Key.Name.DOWN, Key.Name.RIGHT, Key.Name.UP, Key.Name.LEFT))
  );
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();

  this.touchDetector = new TouchDetector();
  this.setTouchTriggerArea();
  var self = this;
  this.trigger = new MultiTrigger()
      .addTrigger((new KeyTrigger()).addTriggerKeyByName('z'))
      .addTrigger(new MouseButtonTrigger())
      .addTrigger(new TouchTrigger().setStartZoneFunction(function(x, y) {
        return Vec2d.distance(x, y, self.triggerPixelX, self.triggerPixelY) <= self.triggerPixelRad;
      }));

  // for sound throttling
  this.hitsThisFrame = 0;

  this.world = null;
  this.tiles = null;

  this.camera = new Camera(0.2, 0.6, 45);

  this.cursorPos = new Vec2d();
  this.cursorVel = new Vec2d();
  this.cursorStamp = null; // it'll be a ring
  this.cursorColorVector = new Vec4();
  this.cursorRad = this.camera.getViewDist() / 20;
  this.modelMatrix = new Matrix44();
  this.cursorMode = PlayScreen.CursorMode.FLOOR;
  this.cursorBody = this.createCursorBody();
  this.indicatedBodyId = null;
  this.indicatorChangeTime = 0;
  this.indicatorStamp = null; // it'll be a ring
  this.indicatorColorVector = new Vec4();
  this.hudViewMatrix = new Matrix44();

  this.bitSize = 0.5;
  this.bitGridMetersPerCell = this.bitSize * 32;
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

PlayScreen.prototype.setTouchTriggerArea = function() {
  this.triggerPixelRad = 0.5 * (this.canvas.width + this.canvas.height) * 0.17;
  this.visibleTriggerScale = 2/3 * this.touchDetector.getVal();
  this.triggerPixelX = this.triggerPixelRad * 0.6;
  this.triggerPixelY = this.canvas.height - this.triggerPixelRad * 0.6;
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
    this.trigger.startListening();
    this.touchDetector.startListening();
  } else {
    this.trackball.stopListening();
    this.trigger.stopListening();
    this.touchDetector.stopListening();
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
  this.controller.gotoScreen(Test34.SCREEN_PAUSE);
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

  var circleModel = RigidModel.createCircleMesh(5);
  this.circleStamp = circleModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.circleStamp);

  var thickness = 0.66;
  var innerRadius = 1 - thickness;
  var model = RigidModel.createRingMesh(5, innerRadius);
  //model.transformPositions(new Matrix44().toScaleOpXYZ(1/innerRadius, 1/innerRadius, 1));
  this.cursorStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cursorStamp);

  thickness = 0.2;
  innerRadius = 1 - thickness;
  model = RigidModel.createRingMesh(6, innerRadius);
  model.transformPositions(new Matrix44().toScaleOpXYZ(1/innerRadius, 1/innerRadius, 1));
  this.indicatorStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.indicatorStamp);
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
  this.initWalls();
};

PlayScreen.prototype.createCursorBody = function() {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = PlayScreen.Group.CURSOR;
  return b;
};

PlayScreen.prototype.initWalls = function() {
  this.bitGrid = new BitGrid(this.bitSize);
  var rad = 15;
  this.bitGrid.drawPill(new Segment(new Vec2d(-rad, -rad*1.2), new Vec2d(rad, -rad*1.2)), rad, 1);

  this.bitGrid.drawPill(new Segment(new Vec2d(-rad * 2.15, rad), new Vec2d(-rad * 2.15, rad)), rad*1.2, 1);
  this.bitGrid.drawPill(new Segment(new Vec2d(rad * 2.15, rad), new Vec2d(rad * 2.15, rad)), rad*1.2, 1);

  this.bitGrid.drawPill(new Segment(new Vec2d(-rad * 2.15, rad), new Vec2d(-rad * 2.15, rad)), rad*0.5, 0);
  this.bitGrid.drawPill(new Segment(new Vec2d(rad * 2.15, rad), new Vec2d(rad * 2.15, rad)), rad*0.9, 0);

  this.tiles = {};
  this.flushTerrainChanges();
};

PlayScreen.prototype.digTerrainAtPos = function(pos) {
  this.bitGrid.drawPill(new Segment(pos, pos), 15, 1);
  this.flushTerrainChanges();
};

PlayScreen.prototype.flushTerrainChanges = function() {
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
//  wallModel.setColorRGB(0.5, 0.3, 0.7);
  wallModel.setColorRGB(Math.random()/2+0.3 , Math.random() * 0.5, Math.random()/2+0.5);
  return wallModel;
};

PlayScreen.prototype.handleInput = function() {
  if (!this.world) return;
  this.setTouchTriggerArea();
  var triggered = this.trigger.getVal();
  var oldCursorPos = Vec2d.alloc().set(this.cursorPos);
  var sensitivity = this.camera.getViewDist() * 0.02;
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    var inertia = 0.75;
    var newVel = Vec2d.alloc().setXY(this.movement.x, -this.movement.y).scale(sensitivity);
    this.cursorVel.scale(inertia).add(newVel.scale(1 - inertia));
    newVel.free();
  }
  this.trackball.reset();
  this.cursorPos.add(this.cursorVel);
  // Increase friction at low speeds, to help make smaller movements.
  var slowness = Math.max(0, (1 - this.cursorVel.magnitude()/sensitivity));
  this.cursorVel.scale(0.95 - 0.2 * slowness);
  if (triggered) {
    this.doTriggerAction(oldCursorPos);
  } else {
    this.doCursorHoverScan();
  }
  oldCursorPos.free();
};

PlayScreen.prototype.doTriggerAction = function(oldCursorPos) {
  switch (this.cursorMode) {
    case PlayScreen.CursorMode.FLOOR:
      this.bitGrid.drawPill(new Segment(oldCursorPos, this.cursorPos), this.cursorRad, 1);
      this.flushTerrainChanges();
      break;
    case PlayScreen.CursorMode.WALL:
      this.bitGrid.drawPill(new Segment(oldCursorPos, this.cursorPos), this.cursorRad, 0);
      this.flushTerrainChanges();
      break;
  }
};

PlayScreen.prototype.doCursorHoverScan = function() {
  this.cursorBody.setPosAtTime(this.cursorPos, this.world.now);
  var i, hitBody, overlapBodyIds;

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
    this.setIndicatedBodyId(smallestBody.id);
    this.cursorMode = PlayScreen.CursorMode.OBJECT;
  } else if (overWall) {
    this.setIndicatedBodyId(null);
    this.cursorMode = PlayScreen.CursorMode.WALL;
  } else {
    this.setIndicatedBodyId(null);
    this.cursorMode = PlayScreen.CursorMode.FLOOR;
  }
};

PlayScreen.prototype.setIndicatedBodyId = function(id) {
  if (id != this.indicatedBodyId) {
    this.indicatedBodyId = id;
    this.indicatorChangeTime = Date.now();
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
  // scale
  this.viewMatrix.toIdentity();
  var pixelsPerMeter = 0.5 * (this.canvas.height + this.canvas.width) / this.camera.getViewDist();
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
          pixelsPerMeter / this.canvas.width,
          pixelsPerMeter / this.canvas.height,
          0.2));

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -this.camera.getX(),
      -this.camera.getY(),
      0));
};

PlayScreen.prototype.drawScene = function() {
  this.camera.follow(this.cursorPos);

  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  if (this.tiles) {
    this.renderer
        .setColorVector(this.levelColorVector)
        .setModelMatrix(this.levelModelMatrix);
    var cx = Math.round((this.camera.getX() - this.bitGrid.cellWorldSize/2) / (this.bitGrid.cellWorldSize));
    var cy = Math.round((this.camera.getY() - this.bitGrid.cellWorldSize/2) / (this.bitGrid.cellWorldSize));

    var pixelsPerMeter = 0.5 * (this.canvas.height + this.canvas.width) / this.camera.getViewDist();
    var pixelsPerCell = this.bitGridMetersPerCell * pixelsPerMeter;
    var cellsPerScreenX = this.canvas.width / pixelsPerCell;
    var cellsPerScreenY = this.canvas.height / pixelsPerCell;
    var rx = Math.ceil(cellsPerScreenX);
    var ry = Math.ceil(cellsPerScreenY);
    for (var dy = -ry; dy <= ry; dy++) {
      for (var dx = -rx; dx <= rx; dx++) {
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

  // Draw UI stuff that goes on top of the world

  this.renderer.setBlendingEnabled(true);

  // cursor
  this.renderer
      .setStamp(this.cursorStamp)
      .setColorVector(this.getCursorColorVector());
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(this.cursorRad, this.cursorRad, 1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.renderer.drawStamp();

  // highlighted body indicator
  var body = this.world.bodies[this.indicatedBodyId];
  if (body) {
    var bodyPos = this.getBodyPos(body);
    this.renderer
        .setStamp(this.indicatorStamp)
        .setColorVector(this.getIndicatorColorVector());
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.99))
        .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));
    this.renderer.setModelMatrix(this.modelMatrix);
    this.renderer.drawStamp();
  }
  this.drawHud();
  this.renderer.setBlendingEnabled(false);

  if (this.restarting) {
    this.controller.restart();
    this.restarting = false;
  } else {
    // Animate whenever this thing draws.
    this.controller.requestAnimation();
  }
};

/**
 * Draw stuff on screen coords, with 0,0 at the top left and canvas.width, canvas.height at the bottom right.
 */
PlayScreen.prototype.drawHud = function() {
  this.touchDetector.decrease();

  // Set hud view matrix
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat4.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat4.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  // draw trigger
  this.renderer
      .setStamp(this.circleStamp)
      .setColorVector(this.getTriggerColorVector());
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.triggerPixelX, this.triggerPixelY, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(
          this.triggerPixelRad * this.visibleTriggerScale,
          this.triggerPixelRad * this.visibleTriggerScale,
          1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.renderer.drawStamp();
};


PlayScreen.prototype.getCursorColorVector = function() {
  var brightness = 0.5 + 0.5 * this.trigger.getVal();
  switch(this.cursorMode) {
    case PlayScreen.CursorMode.FLOOR:
      this.cursorColorVector.setXYZ(1, 0, 0);
      this.cursorColorVector.v[3] = 0.8 * brightness;
      break;
    case PlayScreen.CursorMode.WALL:
      this.cursorColorVector.setXYZ(0, 1, 0);
      this.cursorColorVector.v[3] = 0.8 * brightness;
      break;
    case PlayScreen.CursorMode.OBJECT:
      this.cursorColorVector.setXYZ(1, 1, 1);
      this.cursorColorVector.v[3] = 0.5 * brightness;
      break;
  }
  return this.cursorColorVector;
};

PlayScreen.prototype.getTriggerColorVector = function() {
  this.cursorColorVector.setXYZ(1, 1, 1);
  var touchiness = this.touchDetector.getVal();
  this.cursorColorVector.v[3] = this.trigger.getVal() ? 0.2 : 0.1 * touchiness;
  return this.cursorColorVector;
};

PlayScreen.prototype.getIndicatorColorVector = function() {
  var t = (Date.now() - this.indicatorChangeTime) / 400;
  var c = -Math.cos(t)/5+0.5;
  this.indicatorColorVector.setXYZ(c, c, c);
  this.indicatorColorVector.v[3] = 0.4;
  return this.indicatorColorVector;
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
  this.camera.setXY(0, 0);
};

PlayScreen.prototype.getBodyPos = function(body) {
  return body.getPosAtTime(this.world.now, this.vec2d);
};
