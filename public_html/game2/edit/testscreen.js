/**
 * @constructor
 * @extends {BaseScreen}
 */
function TestScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx);

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.listeners = new ArraySet();
  this.splasher = new Splasher();
  this.splash = new Splash();

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.hudViewMatrix = new Matrix44();

  this.scanReq = new ScanRequest();
  this.scanResp = new ScanResponse();

  this.camera = new Camera(0.1, 1, 35);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.eventDistributor = new LayeredEventDistributor(this.canvas, 3);
  this.addListener(this.eventDistributor);

  this.mouseMoveListener = function() {
    self.testTriggerWidget.setKeyboardTipTimeoutMs(Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS);
  };

  this.testTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .setCanvasScaleXY(EditScreen.WIDGET_RADIUS, EditScreen.WIDGET_RADIUS)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('t')
      .startListening();

  this.testDownFn = function(e) {
    e = e || window.event;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EDIT;
    Url.setFragment(Url.encodeQuery(query));
    e.preventDefault();
  };


  this.pauseTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .setCanvasScaleXY(EditScreen.WIDGET_RADIUS, EditScreen.WIDGET_RADIUS)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName(Key.Name.SPACE)
      .startListening();

  this.pauseDownFn = function(e) {
    e = e || window.event;
    self.paused = !self.paused;
    if (self.paused) {
      // pause
      self.showPausedOverlay();
    } else {
      // resume
      self.hidePausedOverlay();
      self.controller.requestAnimation();
      // TODO: clear the pause button's val
    }
    // Stop the flow of mouse-emulation events on touchscreens, so the
    // mouse events don't cause weird cursors teleports.
    // See http://www.html5rocks.com/en/mobile/touchandmouse/#toc-together
    e.preventDefault();
  };

  this.fullScreenFn = function(e) {
    e = e || window.event;
    self.controller.requestFullScreen();
    e.preventDefault();
  };

  // for sound throttling
  this.hitsThisFrame = 0;

  this.world = null;
  this.tiles = null;

  this.bitSize = 0.5;
  this.bitGridMetersPerCell = TestScreen.BIT_SIZE * BitGrid.BITS;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);

  this.levelStamps = [];
  this.initialized = false;

  this.playerAveragePos = new Vec2d();
}
TestScreen.prototype = new BaseScreen();
TestScreen.prototype.constructor = TestScreen;

TestScreen.BIT_SIZE = 0.5;
TestScreen.WORLD_CELL_SIZE = TestScreen.BIT_SIZE * BitGrid.BITS;

TestScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

TestScreen.prototype.createTrackball = function() {
  var trackball = new MultiTrackball()
      .addTrackball(new TouchTrackball(this.getWorldEventTarget())
          .setStartZoneFunction(function(x, y) { return true; }))
      .addTrackball(new KeyTrackball(new KeyStick().setUpRightDownLeftByName(
          Key.Name.DOWN, Key.Name.RIGHT, Key.Name.UP, Key.Name.LEFT)));
  trackball.setFriction(0.1);
  trackball.startListening();
  return trackball;
};

TestScreen.prototype.createLeftTrigger = function() {
  var trigger = new TriggerWidget(this.getHudEventTarget())
      .setCanvasScaleXY(30, 30)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .setStamp(this.glyphs.stamps['Z'])// TODO real stamp
      .listenToTouch()
      .addTriggerKeyByName('z')
      .setKeyboardTipStamp(this.glyphs.stamps['Z'])
      .startListening();
};

TestScreen.prototype.updateHudLayout = function() {
  this.pauseTriggerWidget.setCanvasPositionXY(this.canvas.width - EditScreen.WIDGET_RADIUS, EditScreen.WIDGET_RADIUS);
  this.testTriggerWidget.setCanvasPositionXY(this.canvas.width - EditScreen.WIDGET_RADIUS, EditScreen.WIDGET_RADIUS * 3);
};


TestScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.pauseTriggerWidget.addTriggerDownListener(this.pauseDownFn);
    this.testTriggerWidget.addTriggerDownListener(this.testDownFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.mouseMoveListener);

  } else {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }
    this.pauseTriggerWidget.removeTriggerDownListener(this.pauseDownFn);
    this.testTriggerWidget.removeTriggerDownListener(this.testDownFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.mouseMoveListener);
  }
  this.listening = listen;
};

TestScreen.prototype.lazyInit = function() {
  if (!this.initialized) {
    this.initSpiritConfigs();
    this.updateHudLayout();
    this.initPermStamps();
    this.initWorld();
    this.initialized = true;
  }
};

TestScreen.prototype.initSpiritConfigs = function() {
  this.spiritConfigs = {};

  var self = this;
  function addConfig(type, ctor) {
    var model = ctor.createModel();
    var stamp = model.createModelStamp(self.renderer.gl);
    self.spiritConfigs[type] = new SpiritConfig(type, ctor, stamp);
  }

  addConfig(BaseScreen.SpiritType.ANT, AntSpirit);

  addConfig(BaseScreen.SpiritType.PLAYER, PlayerSpirit);
};

TestScreen.prototype.initPermStamps = function() {
  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cubeStamp);

  var pauseModel = new RigidModel();
  pauseModel.addRigidModel(RigidModel.createRingMesh(4, 0.5)
      .transformPositions(new Matrix44().toScaleOpXYZ(0.5, 0.5, 0.5)));
  var teeth = 8;
  for (var r = 0; r < teeth; r++) {
    pauseModel.addRigidModel(
        RigidModel.createSquare()
            .transformPositions(new Matrix44().toScaleOpXYZ(0.09, 0.1, 1))
            .transformPositions(new Matrix44().toTranslateOpXYZ(0, -0.6, 0))
            .transformPositions(new Matrix44().toRotateZOp(2 * Math.PI * r / teeth)));
  }
  this.pauseStamp = pauseModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.pauseStamp);
  this.pauseTriggerWidget.setStamp(this.pauseStamp);

  var testModel = RigidModel.createTriangle()
      .transformPositions(new Matrix44().toScaleOpXYZ(0.4, 0.3, 1))
      .transformPositions(new Matrix44().toRotateZOp(Math.PI/2));
  this.testStamp = testModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.testStamp);
  this.testTriggerWidget
      .setStamp(this.testStamp)
      .setKeyboardTipStamp(this.glyphs.stamps['T'])
      .setKeyboardTipScaleXY(4, -4)
      .setKeyboardTipOffsetXY(EditScreen.WIDGET_RADIUS * 0.6, EditScreen.WIDGET_RADIUS * 0.7);

  var model = RigidModel.createDoubleRing(64);
  this.soundStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.soundStamp);
};

TestScreen.prototype.initWorld = function() {
  this.bitGrid = new BitGrid(this.bitSize);
  this.tiles = {};

  this.lastPathRefreshTime = -Infinity;

  var groupCount = Object.keys(BaseScreen.Group).length;
  this.world = new World(TestScreen.WORLD_CELL_SIZE, groupCount, [
    [BaseScreen.Group.EMPTY, BaseScreen.Group.EMPTY],
    [BaseScreen.Group.ROCK, BaseScreen.Group.WALL],
    [BaseScreen.Group.ROCK, BaseScreen.Group.ROCK],
    [BaseScreen.Group.CURSOR, BaseScreen.Group.WALL],
    [BaseScreen.Group.CURSOR, BaseScreen.Group.ROCK]
  ]);
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.5;
};

/**
 * @param {Object} json
 */
TestScreen.prototype.loadWorldFromJson = function (json) {
  this.lazyInit();
  this.world.now = json.now;
  // bodies
  for (var i = 0; i < json.bodies.length; i++) {
    var bodyJson = json.bodies[i];
    var body = new Body();
    body.setFromJSON(bodyJson);
    this.world.loadBody(body);
  }
  // spirits
  for (var i = 0; i < json.spirits.length; i++) {
    var spiritJson = json.spirits[i];
    var spiritType = spiritJson[0];
    var spiritConfig = this.spiritConfigs[spiritType];
    if (spiritConfig) {
      var spirit = new spiritConfig.ctor(this);
      spirit.setModelStamp(spiritConfig.stamp);
      spirit.setFromJSON(spiritJson);
      this.world.loadSpirit(spirit);
    } else {
      console.error("Unknown spiritType " + spiritType + " in spirit JSON: " + spiritJson);
    }
  }
  // timeouts
  var e = new WorldEvent();
  for (var i = 0; i < json.timeouts.length; i++) {
    e.setFromJSON(json.timeouts[i]);
    this.world.loadTimeout(e);
  }
  // splashes
  var splash = new Splash();
  for (var i = 0; i < json.splashes.length; i++) {
    var splashJson = json.splashes[i];
    var splashType = splashJson[0];
    // TODO: splashConfig plugin, like spiritConfig
    if (splashType == TestScreen.SplashType.NOTE) {
      splash.setFromJSON(splashJson);
      splash.stamp = this.soundStamp;
      this.splasher.addCopy(splash);
    } else {
      console.error("Unknown splashType " + splashType + " in spirit JSON: " + splashJson);
    }
  }
  // terrain
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tiles = {};
  this.flushTerrainChanges();

  // cursor and camera
  this.camera.cameraPos.set(Vec2d.fromJSON(json.cameraPos));
};

TestScreen.prototype.digTerrainAtPos = function(pos) {
  this.bitGrid.drawPill(new Segment(pos, pos), 15, 1);
  this.flushTerrainChanges();
};

TestScreen.prototype.flushTerrainChanges = function() {
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
TestScreen.prototype.changeTerrain = function(cellId) {
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

TestScreen.prototype.loadCellXY = function(cx, cy) {
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

TestScreen.prototype.unloadCellXY = function(cx, cy) {
  this.unloadCellId(this.bitGrid.getCellIdAtIndexXY(cx, cy));
};

TestScreen.prototype.unloadCellId = function(cellId) {
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
TestScreen.prototype.createWallBody = function(rect) {
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosAtTime(rect.pos, this.world.now);
  b.rectRad.set(rect.rad);
  b.hitGroup = BaseScreen.Group.WALL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  return b;
};

TestScreen.prototype.createTileStamp = function(rects) {
  var model = new RigidModel();
  for (var i = 0; i < rects.length; i++) {
    model.addRigidModel(this.createWallModel(rects[i]));
  }
  return model.createModelStamp(this.renderer.gl);
};

TestScreen.prototype.createWallModel = function(rect) {
  var transformation, wallModel;
  transformation = new Matrix44()
      .toTranslateOpXYZ(rect.pos.x, rect.pos.y, 0)
      .multiply(new Matrix44().toScaleOpXYZ(rect.rad.x, rect.rad.y, 1));
  wallModel = RigidModel.createSquare().transformPositions(transformation);
  wallModel.setColorRGB(0.2, 0.3, 0.6);
  return wallModel;
};

TestScreen.prototype.addNoteSplash = function(x, y, dx, dy, r, g, b, bodyRad) {
  var fullRad = bodyRad * 2;// * (1+Math.random()/2);
  var s = this.splash;
  s.reset(TestScreen.SplashType.NOTE, this.soundStamp);

  s.startTime = this.world.now;
  s.duration = 10;

  s.startPose.pos.setXYZ(x, y, 0);
  s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose.scale.setXYZ(fullRad, fullRad, 1);
  s.endPose.scale.setXYZ(fullRad*2, fullRad*2, 1);

  s.startPose2.pos.setXYZ(x, y, 0);
  s.endPose2.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose2.scale.setXYZ(fullRad*0.5, fullRad*0.5, 1);
  s.endPose2.scale.setXYZ(fullRad*1.9, fullRad*1.9, 1);

  s.startPose.rotZ = s.startPose2.rotZ = Math.PI * 2 * Math.random();
  s.endPose.rotZ = s.endPose2.rotZ = s.startPose.rotZ + 0.3 * Math.PI * (Math.random() - 0.5);

  s.startColor.setXYZ(r, g, b);
  s.endColor.setXYZ(r, g, b);

  s.duration = 8;
  s.endPose.rotZ = s.endPose2.rotZ =s.startPose2.rotZ;
  this.splasher.addCopy(s);
};

TestScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

TestScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

TestScreen.prototype.updateViewMatrix = function() {
  // scale
  this.viewMatrix.toIdentity();
  var pixelsPerMeter = 0.5 * (this.canvas.height + this.canvas.width) / this.camera.getViewDist();
  this.viewMatrix
      .multiply(this.mat44.toScaleOpXYZ(
              pixelsPerMeter / this.canvas.width,
              pixelsPerMeter / this.canvas.height,
          0.2));

  // center
  this.viewMatrix.multiply(this.mat44.toTranslateOpXYZ(
      -this.camera.getX(),
      -this.camera.getY(),
      0));
};

TestScreen.prototype.handleInput = function () {
  if (!this.world) return;
};

TestScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;

  // Position the camera to be at the average of all player sprite body postions
  this.playerAveragePos.reset();
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    spirit.onDraw(this.world, this.renderer);
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
      var body = spirit.getBody(this.world);
      if (body) {
        this.playerAveragePos.add(this.getBodyPos(body, this.vec2d));
        playerCount++;
      }
    }
  }
  if (playerCount != 0) {
    this.playerAveragePos.scale(1 / playerCount);
    this.camera.follow(this.playerAveragePos);
  }

  this.sfx.setListenerXYZ(this.camera.getX(), this.camera.getY(), 5);

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
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();
  this.configMousePointer();

  if (this.restarting) {
    this.controller.restart();
    this.restarting = false;
  } else {
    // Animate whenever this thing draws.
    if (!this.paused) {
      this.controller.requestAnimation();
    }
  }
};

TestScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.pauseTriggerWidget.draw(this.renderer);
  this.testTriggerWidget.draw(this.renderer);
  this.renderer.setBlendingEnabled(false);
};

TestScreen.prototype.configMousePointer = function() {
  if (this.pauseTriggerWidget.isMouseHovered() ||
      this.testTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

TestScreen.prototype.getPauseTriggerColorVector = function() {
  this.colorVector.setRGBA(1, 1, 1, this.paused ? 0 : 0.1);
  return this.colorVector;
};

TestScreen.prototype.unloadLevel = function() {
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
  this.camera.setXY(0, 0);
};

TestScreen.prototype.showPausedOverlay = function() {
  document.querySelector('#pausedOverlay').style.display = 'block';
  this.canvas.style.cursor = "auto";
};

TestScreen.prototype.hidePausedOverlay = function() {
  document.querySelector('#pausedOverlay').style.display = 'none';
  this.canvas.style.cursor = "";
};

/////////////////////
// Editor API stuff
/////////////////////

TestScreen.prototype.getBodyPos = function(body, outVec2d) {
  return body.getPosAtTime(this.world.now, outVec2d);
};

TestScreen.prototype.getCanvas = function() {
  return this.canvas;
};

TestScreen.prototype.addListener = function(listener) {
  this.listeners.put(listener);
  if (this.listening) {
    listener.startListening();
  }
};

TestScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getOverlaps(body);
};

TestScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

TestScreen.prototype.drawTerrainPill = function(pos0, pos1, rad, color) {
  this.bitGrid.drawPill(new Segment(pos0, pos1), rad, color);
  this.flushTerrainChanges();
};

TestScreen.prototype.removeByBodyId = function(bodyId) {
  var body = this.world.getBody(bodyId);
  if (body) {
    if (body.spiritId) {
      this.world.removeSpiritId(body.spiritId);
    }
    this.world.removeBodyId(bodyId);
  }
};

TestScreen.prototype.getCursorHitGroup = function() {
  return BaseScreen.Group.CURSOR;
};

TestScreen.prototype.getWallHitGroup = function() {
  return BaseScreen.Group.WALL;
};

TestScreen.prototype.getWorldTime = function() {
  return this.world.now;
};

TestScreen.prototype.getViewDist = function() {
  return this.camera.getViewDist();
};

TestScreen.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

TestScreen.prototype.getPopupEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(TestScreen.EventLayer.POPUP);
};

TestScreen.prototype.getHudEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(TestScreen.EventLayer.HUD);
};

TestScreen.prototype.getWorldEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(TestScreen.EventLayer.WORLD);
};

/////////////////
// Spirit APIs //
/////////////////

/**
 * @param {number} hitGroup
 * @param {Vec2d} pos
 * @param {Vec2d} vel
 * @param {number} rad
 * @returns {number} fraction (0-1) of vel where the hit happened, or -1 if there was no hit.
 */
TestScreen.prototype.scan = function(hitGroup, pos, vel, rad) {
  this.scanReq.hitGroup = hitGroup;
  // write the body's position into the req's position slot.
  this.scanReq.pos.set(pos);
  this.scanReq.vel.set(vel);
  this.scanReq.shape = Body.Shape.CIRCLE;
  this.scanReq.rad = rad;
  var retval = -1;
  var hit = this.world.rayscan(this.scanReq, this.scanResp);
  if (hit) {
    retval = this.scanResp.timeOffset;
  }
  return retval;
};

TestScreen.prototype.isPlaying = function() {
  return true;
};
