/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sfx) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx);

  this.listeners = new ArraySet();
  this.splasher = new Splasher();
  this.splash = new Splash();

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.hudViewMatrix = new Matrix44();

  this.scanReq = new ScanRequest();
  this.scanResp = new ScanResponse();

  this.camera = new Camera(0.2, 0.6, 35);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.eventDistributor = new LayeredEventDistributor(this.canvas, 3);
  this.addListener(this.eventDistributor);

  this.pauseTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .setCanvasScaleXY(20, 20)
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
      self.updateSharableUrl();
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
  this.bitGridMetersPerCell = PlayScreen.BIT_SIZE * BitGrid.BITS;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);

  this.levelStamps = [];
  this.initialized = false;
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.BIT_SIZE = 0.5;
PlayScreen.WORLD_CELL_SIZE = PlayScreen.BIT_SIZE * BitGrid.BITS;

PlayScreen.ANT_RAD = 0.8;
PlayScreen.ROCK_RAD = 1.4;

PlayScreen.MenuItem = {
  ROCK: 'rock',
  RED_ANT: 'red_ant'
};

PlayScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

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

PlayScreen.SpiritType = {
  BALL: 1,
  SOUND: 2,
  ANT: 3
};

PlayScreen.SplashType = {
  NOTE: 1
};

PlayScreen.prototype.initEditor = function() {
  this.rockModel = RigidModel.createCircleMesh(5);
  this.rockStamp = this.rockModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.rockStamp);

  this.antModel = RigidModel.createCircleMesh(4)
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(Math.PI / 8)))
      .addRigidModel(RigidModel.createSquare()
          .transformPositions(new Matrix44().toScaleOpXYZ(0.1, 0.5, 1))
          .transformPositions(new Matrix44().toTranslateOpXYZ(0, 1, 0))
          .transformPositions(new Matrix44().toRotateZOp(-Math.PI / 8)));
  this.antStamp = this.antModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.antStamp);

  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs);
  this.editor.addMenuItem(0, 0, PlayScreen.MenuItem.ROCK, this.rockModel);
  this.editor.addMenuItem(1, 0, PlayScreen.MenuItem.RED_ANT, this.antModel);
  for (var group = 0; group < 2; group++) {
    this.editor.addMenuKeyboardShortcut(group, group + 1);
  }

};

PlayScreen.prototype.updateHudLayout = function() {
  this.pauseTriggerWidget.setCanvasPositionXY(this.canvas.width - 20, 20);
  this.editor.updateHudLayout();
};


PlayScreen.prototype.updateSharableUrl = function() {
  var levelJson = this.toJSON();
  var squisher = new Squisher();
  var anchor = document.querySelector('#sharableUrl');
  var hashString = squisher.squish(JSON.stringify(levelJson));
  anchor.href = window.location.href.split("#")[0] + "#" + hashString;
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.pauseTriggerWidget.addTriggerDownListener(this.pauseDownFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

  } else {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }
    this.pauseTriggerWidget.removeTriggerDownListener(this.pauseDownFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);
  }
  this.listening = listen;
};

PlayScreen.prototype.lazyInit = function() {
  if (!this.initialized) {
    this.initEditor();
    this.updateHudLayout();
    this.initPermStamps();
    this.initWorld();
    this.initialized = true;
  }
};

PlayScreen.prototype.initPermStamps = function() {
  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cubeStamp);

  var pauseModel = new RigidModel();
  for (var x = -1; x <= 1; x+=2) {
    pauseModel.addRigidModel(RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.2, 0.6, 1)
            .multiply(new Matrix44().toTranslateOpXYZ(x*1.9, 0, 0)
    ))));
  }
  this.pauseStamp = pauseModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.pauseStamp);
  this.pauseTriggerWidget.setStamp(this.pauseStamp);

  var model = RigidModel.createTube(64);
  this.soundStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.soundStamp);

  var editorStamps = this.editor.getStamps();
  for (var i = 0; i < editorStamps.length; i++) {
    this.levelStamps.push(editorStamps[i]);
  }
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
  var frag = Url.getFragment();
  if (!frag || !this.maybeLoadWorldFromFragment(frag)) {
    this.createDefaultWorld();
  }
};

PlayScreen.prototype.toJSON = function() {
  var json = {
    terrain: this.bitGrid.toJSON(),
    now: this.world.now,
    bodies: [],
    spirits: [],
    timeouts: [],
    splashes: [],
    cursorPos: this.editor.cursorPos.toJSON(),
    cameraPos: this.camera.cameraPos.toJSON()
  };
  // bodies
  for (var bodyId in this.world.bodies) {
    var body = this.world.bodies[bodyId];
    if (body.hitGroup != PlayScreen.Group.WALL) {
      json.bodies.push(body.toJSON());
    }
  }
  // spirits
  for (var spiritId in this.world.spirits) {
    var spirit = this.world.spirits[spiritId];
    json.spirits.push(spirit.toJSON());
  }
  // timeouts
  for (var e = this.world.queue.getFirst(); e; e = e.next[0]) {
    if (e.type === WorldEvent.TYPE_TIMEOUT) {
      var spirit = this.world.spirits[e.spiritId];
      if (spirit) {
        json.timeouts.push(e.toJSON());
      }
    }
  }
  // splashes
  var splashes = this.splasher.splashes;
  for (var i = 0; i < splashes.length; i++) {
    json.splashes.push(splashes[i].toJSON());
  }
  return json;
};

PlayScreen.prototype.maybeLoadWorldFromFragment = function(frag) {
  try {
    var squisher = new Squisher();
    var jsonStr = squisher.unsquish(frag);
    var jsonObj = JSON.parse(jsonStr);
  } catch (e) {
    console.error("maybeLoadWorldFromFragment error", e);
    return false;
  }
  if (jsonObj) {
    this.world.now = jsonObj.now;
    // bodies
    for (var i = 0; i < jsonObj.bodies.length; i++) {
      var bodyJson = jsonObj.bodies[i];
      var body = new Body();
      body.setFromJSON(bodyJson);
      this.world.loadBody(body);
    }
    // spirits
    for (var i = 0; i < jsonObj.spirits.length; i++) {
      var spiritJson = jsonObj.spirits[i];
      var spiritType = spiritJson[0];
      if (spiritType == PlayScreen.SpiritType.BALL) {
        var spirit = new BallSpirit(this);
        spirit.setModelStamp(this.rockStamp);
        spirit.setFromJSON(spiritJson);
        this.world.loadSpirit(spirit);
      } else if (spiritType == PlayScreen.SpiritType.SOUND) {
        var spirit = new SoundSpirit(this);
        spirit.setModelStamp(this.rockStamp);
        spirit.setFromJSON(spiritJson);
        this.world.loadSpirit(spirit);
      } else if (spiritType == PlayScreen.SpiritType.ANT) {
        var spirit = new AntSpirit(this);
        spirit.setModelStamp(this.antStamp);
        spirit.setFromJSON(spiritJson);
        this.world.loadSpirit(spirit);
      } else {
        console.error("Unknown spiritType " + spiritType + " in spirit JSON: " + spiritJson);
      }
    }
    // timeouts
    var e = new WorldEvent();
    for (var i = 0; i < jsonObj.timeouts.length; i++) {
      e.setFromJSON(jsonObj.timeouts[i]);
      this.world.loadTimeout(e);
    }
    // splashes
    var splash = new Splash();
    for (var i = 0; i < jsonObj.splashes.length; i++) {
      var splashJson = jsonObj.splashes[i];
      var splashType = splashJson[0];
      if (splashType == PlayScreen.SplashType.NOTE) {
        splash.setFromJSON(splashJson);
        splash.stamp = this.soundStamp;
        this.splasher.addCopy(splash);
      } else {
        console.error("Unknown splashType " + splashType + " in spirit JSON: " + splashJson);
      }
    }
    // terrain
    this.bitGrid = BitGrid.fromJSON(jsonObj.terrain);
    this.tiles = {};
    this.flushTerrainChanges();

    // cursor and camera
    this.editor.cursorPos.set(Vec2d.fromJSON(jsonObj.cursorPos));
    this.camera.cameraPos.set(Vec2d.fromJSON(jsonObj.cameraPos));
  }
  return true;
};

PlayScreen.prototype.createDefaultWorld = function() {
  var count = 16;
  for (var i = 0; i < count; i++) {
    this.initSoundSpirit(
        new Vec2d(i/count * 60 - 30, 0),
        0.9,
        (i + (Math.random() < 0.33 ? (1.05 - Math.random() * 0.1) : 0))/count);
    this.initAntSpirit(new Vec2d(i/count * 60 - 30, -5), PlayScreen.ANT_RAD);
  }
  this.initRock(new Vec2d(40, 0), PlayScreen.ROCK_RAD);
  this.initRock(new Vec2d(-40, 0), PlayScreen.ROCK_RAD);
  this.initWalls();
};

PlayScreen.prototype.initAntSpirit = function(pos, rad) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = AntSpirit.MEASURE_TIMEOUT * 2;
  var spirit = new AntSpirit(this);
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.antStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(1, 0, 0);
  this.world.addTimeout(this.world.now, spiritId, -1);
  return spiritId;
};

PlayScreen.prototype.initRock = function(pos, rad) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = BallSpirit.MEASURE_TIMEOUT;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.rockStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(1, 0.2, 0.6);
  this.world.addTimeout(this.world.now, spiritId, -1);
  return spiritId;
};

PlayScreen.prototype.initSoundSpirit = function(pos, rad, measureFraction) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = SoundSpirit.MEASURE_TIMEOUT * 2;
  var spirit = new SoundSpirit(this);
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.rockStamp);

  var high = Math.random() < 0.5;
  var hard = Math.random() < 0.5;
  var low = !high && hard && Math.random() < 0.5;

  var maxPow = 2;
  var notes = 4 * maxPow;
  var rand = 2;
  var base = 7 + (low ? -1 : 0) + (high ? 2 : 0);
  var f = Math.pow(2, base + Math.floor((high ? 1-Math.random()/2 : Math.random()) * notes)/notes * maxPow);
  spirit.setSounds([
      [
        measureFraction,
        hard ? 2 : 1,
        0, low ? 0.2 : 0, 0.2 + 0.1 * Math.random(),
        f + (Math.random() - 0.5) * rand, f,
        low || hard ? 'square' : 'sine'
      ],
      [
        measureFraction,
        hard ? 2 : 1,
        0, low ? 0.2 : 0, 0.2 + 0.1 * Math.random(),
        f*2 + (Math.random() - 0.5) * rand, f*2,
        'sine'
      ],
      [
        measureFraction,
        hard ? 2 : 1,
        0, low ? 0.2 : 0, 0.2 + 0.1 * Math.random(),
        f*3 + (Math.random() - 0.5) * rand, f*3,
        'triangle'
      ]
  ]);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(0, 1, hard ? 1 : 0);
  this.world.spirits[spiritId].hard = hard;
  this.world.addTimeout(this.world.now, spiritId, -1);

  return spiritId;
};

PlayScreen.prototype.initWalls = function() {
  function randVec() {
    return new Vec2d(Math.random()-0.5, Math.random()-0.5).scale(100);
  }
  this.bitGrid = new BitGrid(this.bitSize);
  this.bitGrid.drawPill(new Segment(new Vec2d(-50, 0), new Vec2d(50, 0)), 10, 1);
  for (var i = 0; i < 16; i++) {
    this.bitGrid.drawPill(new Segment(randVec(), randVec()), 2, 1);
  }

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
  wallModel.setColorRGB(0.2, 0.3, 0.6);
//  wallModel.setColorRGB(Math.random()/2+0.3 , Math.random() * 0.5, Math.random()/2+0.5);
  return wallModel;
};

PlayScreen.prototype.addNoteSplash = function(x, y, dx, dy, r, g, b, bodyRad) {
  var fullRad = bodyRad * 2;// * (1+Math.random()/2);
  var s = this.splash;
  s.reset(PlayScreen.SplashType.NOTE, this.soundStamp);

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

PlayScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

PlayScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.sfx.setListenerXYZ(this.editor.cursorPos.x, this.editor.cursorPos.y, 5);

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
  this.editor.drawScene();
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

PlayScreen.prototype.drawHud = function() {
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
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

PlayScreen.prototype.configMousePointer = function() {
  if (this.pauseTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

PlayScreen.prototype.getPauseTriggerColorVector = function() {
  this.colorVector.setRGBA(1, 1, 1, this.paused ? 0 : 0.1);
  return this.colorVector;
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
  this.editor.cursorPos.reset();
  this.editor.cursorVel.reset();
  this.camera.setXY(0, 0);
};

PlayScreen.prototype.showPausedOverlay = function() {
  document.querySelector('#pausedOverlay').style.display = 'block';
  this.canvas.style.cursor = "auto";
};

PlayScreen.prototype.hidePausedOverlay = function() {
  document.querySelector('#pausedOverlay').style.display = 'none';
  this.canvas.style.cursor = "";
};

/////////////////////
// Editor API stuff
/////////////////////

PlayScreen.prototype.getBodyPos = function(body, outVec2d) {
  return body.getPosAtTime(this.world.now, outVec2d);
};

PlayScreen.prototype.getCanvas = function() {
  return this.canvas;
};

PlayScreen.prototype.addListener = function(listener) {
  this.listeners.put(listener);
  if (this.listening) {
    listener.startListening();
  }
};

PlayScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getOverlaps(body);
};

PlayScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

PlayScreen.prototype.drawTerrainPill = function(pos0, pos1, rad, color) {
  this.bitGrid.drawPill(new Segment(pos0, pos1), rad, color);
  this.flushTerrainChanges();
};

PlayScreen.prototype.addItem = function(name, pos) {
  switch (name) {
    case PlayScreen.MenuItem.ROCK:
      this.initRock(pos, PlayScreen.ROCK_RAD);
      break;
    case PlayScreen.MenuItem.RED_ANT:
      this.initAntSpirit(pos, PlayScreen.ANT_RAD);
      break;
  }
};

PlayScreen.prototype.removeByBodyId = function(bodyId) {
  var body = this.world.getBody(bodyId);
  if (body) {
    if (body.spiritId) {
      this.world.removeSpiritId(body.spiritId);
    }
    this.world.removeBodyId(bodyId);
  }
};

PlayScreen.prototype.getCursorHitGroup = function() {
  return PlayScreen.Group.CURSOR;
};

PlayScreen.prototype.getWallHitGroup = function() {
  return PlayScreen.Group.WALL;
};

PlayScreen.prototype.getWorldTime = function() {
  return this.world.now;
};

PlayScreen.prototype.getViewDist = function() {
  return this.camera.getViewDist();
};

PlayScreen.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

PlayScreen.prototype.getPopupEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(PlayScreen.EventLayer.POPUP);
};

PlayScreen.prototype.getHudEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(PlayScreen.EventLayer.HUD);
};

PlayScreen.prototype.getWorldEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(PlayScreen.EventLayer.WORLD);
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
PlayScreen.prototype.scan = function(hitGroup, pos, vel, rad) {
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
