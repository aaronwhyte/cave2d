/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sfx) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx);

  this.splasher = new Splasher();
  this.splash = new Splash();

  this.listeners = new ArraySet();
  this.touchDetector = new TouchDetector();
  this.listeners.put(this.touchDetector);

  var self = this;

  // pause trigger and function
  this.pauseTouchTrigger = new RoundTouchTrigger(canvas)
      .setPosFractionXY(0.5, 0).setRadCoefsXY(0.07, 0.07);
  this.pauseTrigger = new MultiTrigger()
      .addTrigger((new KeyTrigger()).addTriggerKeyByName(Key.Name.SPACE))
      .addTrigger(this.pauseTouchTrigger);
  this.listeners.put(this.pauseTrigger);
  this.pauseDownFn = function() {
    self.paused = !self.paused;
    if (self.paused) {
      // pause
      self.showPausedOverlay();
      self.updateSharableUrl();
    } else {
      // resume
      self.hidePausedOverlay();
      self.controller.requestAnimation();
    }
  };

  this.fullScreenFn = function() {
    self.controller.requestFullScreen();
  };

  // for sound throttling
  this.hitsThisFrame = 0;

  this.world = null;
  this.tiles = null;

  this.camera = new Camera(0.2, 0.6, 45);

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.hudViewMatrix = new Matrix44();

  this.bitSize = 0.5;
  this.bitGridMetersPerCell = PlayScreen.BIT_SIZE * BitGrid.BITS;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);

  this.editor = new Editor(this, this.canvas, this.renderer);
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.BIT_SIZE = 0.5;
PlayScreen.WORLD_CELL_SIZE = PlayScreen.BIT_SIZE * BitGrid.BITS;

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
  SOUND: 2
};

PlayScreen.SplashType = {
  NOTE: 1
};

PlayScreen.prototype.updateSharableUrl = function() {
  var levelJson = this.toJSON();
  var squisher = new Squisher();
  var anchor = document.querySelector('#sharableUrl');
  var hashString = squisher.squish(JSON.stringify(levelJson));
  anchor.href = window.location.href.split("#")[0] + "#" + hashString;
};

PlayScreen.prototype.onPointerDown = function(pageX, pageY) {
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var self = this;
  var fsb, rb, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.pauseTrigger.addTriggerDownListener(this.pauseDownFn);

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
    this.pauseTrigger.removeTriggerDownListener(this.pauseDownFn);

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
  if (!this.levelStamps) {
    this.initPermStamps();
  }
  if (!this.world) {
    this.initWorld();
  }
};

PlayScreen.prototype.initPermStamps = function() {
  var model;
  this.levelStamps = [];

  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cubeStamp);

  model = RigidModel.createCircleMesh(5);
  this.circleStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.circleStamp);

  model = RigidModel.createDoubleRing(6);
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
        spirit.setModelStamp(this.circleStamp);
        spirit.setFromJSON(spiritJson);
        this.world.loadSpirit(spirit);
      } else if (spiritType == PlayScreen.SpiritType.SOUND) {
        var spirit = new SoundSpirit(this);
        spirit.setModelStamp(this.circleStamp);
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
  for (var i = 0; i < 16; i++) {
    this.initSoundSpirit(new Vec2d(i/16 * 60 - 30, 2), 1.2, i/16, i);
    this.initSoundSpirit(new Vec2d(i/16 * 60 - 30, -2), 1.2, i/16, i);
  }
  this.initBoulder(new Vec2d(40, 0), 4);
  this.initBoulder(new Vec2d(-40, 0), 4);
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
  b.pathDurationMax = 0xffffff; // a really big number, but NOT Infinity.
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.circleStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(0.5, 0.5, 0.6);
  return spiritId;
};

PlayScreen.prototype.initSoundSpirit = function(pos, rad, measureFraction, sixteenth) {
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ROCK;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = 0xffffff; // a really big number, but NOT Infinity.
  var spirit = new SoundSpirit(this);
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.circleStamp);

  var hard = !(sixteenth % 4) || sixteenth == 7 || sixteenth == 10;
  var low = sixteenth == 0 || sixteenth == 7 || sixteenth == 8 || sixteenth == 10;
  var high = sixteenth == 4 || sixteenth == 12;

  var maxPow = 2;
  var notes = 2 * maxPow;
  var rand = 2;
  var base = 7 + (low ? -1 : 0) + (high ? 1 : 0);
  var f = Math.pow(2, base + Math.floor(Math.random() * notes)/notes * maxPow);
  spirit.setSounds([
      [
        measureFraction,
        (hard ? 1.4 : 0.5),
        0, 0.2 + 0.1 * Math.random(), 0.5 + 0.1 * Math.random(),
        f + (Math.random() - 0.5) * rand, f,
        low || hard ? 'square' : 'sine'
      ],
      [
        measureFraction,
        hard ? 1.3 : 0.5,
        0.02*Math.random(), 0.3 + 0.1 * Math.random(), 0.5 + 0.1 * Math.random(),
        f*2 + (Math.random() - 0.5) * rand, f*2,
        'sine'
      ],
      [
        measureFraction,
        hard ? 1 : 0.5,
        0.02*Math.random(), 0.3 + 0.1 * Math.random(), 0.5 + 0.1 * Math.random(),
        f*3 + (Math.random() - 0.5) * rand, f*3,
        'triangle'
      ]
  ]);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  var r = Math.random() / 2;
  this.world.spirits[spiritId].setColorRGB(r, 0.5 - r, measureFraction);
  this.world.spirits[spiritId].hard = hard;
  this.world.addTimeout(this.world.now, spiritId, -1);

  return spiritId;
};

PlayScreen.prototype.initWalls = function() {
  this.bitGrid = new BitGrid(this.bitSize);
  this.bitGrid.drawPill(new Segment(new Vec2d(-30, 0), new Vec2d(30, 0)), 15, 1);
  this.bitGrid.drawPill(new Segment(new Vec2d(-100, 0), new Vec2d(100, 0)), 2, 1);
  this.bitGrid.drawPill(new Segment(new Vec2d(-100, 0), new Vec2d(-100, 0)), 15, 1);
  this.bitGrid.drawPill(new Segment(new Vec2d(100, 0), new Vec2d(100, 0)), 15, 1);

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
  wallModel.setColorRGB(0.5, 0.5, 0.7);
//  wallModel.setColorRGB(Math.random()/2+0.3 , Math.random() * 0.5, Math.random()/2+0.5);
  return wallModel;
};

PlayScreen.prototype.addNoteSplash = function(x, y, dx, dy, r, g, b, bodyRad) {
  var fullRad = bodyRad * 3;// * (1+Math.random()/2);
  var s = this.splash;
  s.reset(PlayScreen.SplashType.NOTE, this.soundStamp);

  s.startTime = this.world.now;
  s.duration = 30 + 2 * (Math.random() - 0.5);

  s.startPose.pos.setXYZ(x, y, 0);
  s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose.scale.setXYZ(fullRad/2, fullRad/2, 1);
  s.endPose.scale.setXYZ(fullRad, fullRad, 1);

  s.startPose2.pos.setXYZ(x, y, 0);
  s.endPose2.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose2.scale.setXYZ(-fullRad/2, -fullRad/2, 1);
  s.endPose2.scale.setXYZ(fullRad, fullRad, 1);

  s.startPose.rotZ = s.startPose2.rotZ = Math.PI * 2 * Math.random();
  s.endPose.rotZ = s.endPose2.rotZ = s.startPose.rotZ + Math.PI * (Math.random() - 0.5);

  s.startColor.setXYZ(r, g, b);
  s.endColor.setXYZ(r, g, b);

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
//  this.camera.follow(this.cursorPos);

  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
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

  this.editor.drawScene();

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

PlayScreen.prototype.getPauseTriggerColorVector = function() {
  var touchiness = this.touchDetector.getVal();
  this.colorVector.setRGBA(1, 1, 1, this.paused ? 0 : 0.1 * touchiness);
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
};

PlayScreen.prototype.hidePausedOverlay = function() {
  document.querySelector('#pausedOverlay').style.display = 'none';
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