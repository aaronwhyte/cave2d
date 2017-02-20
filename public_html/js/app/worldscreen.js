/**
 * Extensible base-class for Screens that mainly wrap a World.
 * @constructor
 * @extends Screen
 */
function WorldScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  Screen.call(this);

  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.stamps = stamps;

  this.viewMatrix = new Matrix44();
  this.mat44 = new Matrix44();

  this.sounds = new Sounds(sfx, this.viewMatrix);

  this.listening = false;
  this.paused = false;

  this.splasher = new Splasher();
  this.splash = new Splash();

  this.pair = [null, null];

  this.scanReq = new ScanRequest();
  this.scanResp = new ScanResponse();

  this.listeners = new ArraySet();
  this.eventDistributor = new LayeredEventDistributor(this.canvas, 3);
  this.addListener(this.eventDistributor);
  this.resizeFn = this.getResizeFn();

  this.world = null;

  this.bitSize = 0.5;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(0.4, 0.4, 0.4);
  this.drawScans = false;

  this.timeMultiplier = 1;

  this.glyphs = new Glyphs(new GlyphMaker(0.4, 1.2));
  this.glyphs.initStamps(this.renderer.gl);

  // undo/redo support
  this.dirty = false;
  this.somethingMoving = false;

  var self = this;

  this.pauseDownFn = function(e) {
    e = e || window.event;
    self.paused = !self.paused;
    if (self.paused) {
      // pause
      self.showPauseMenu();
    } else {
      // resume
      self.hidePauseMenu();
      self.controller.requestAnimation();
      // TODO: clear the pause button's val
    }
    // Stop the flow of mouse-emulation events on touchscreens, so the
    // mouse events don't cause weird cursors teleports.
    // See http://www.html5rocks.com/en/mobile/touchandmouse/#toc-together
    if (e) e.preventDefault();
  };

  this.fullScreenFn = function(e) {
    e = e || window.event;
    self.controller.requestFullScreen();
    e.preventDefault();
  };

  this.canvasCuboid = new Cuboid();
  this.cuboidRules = [];
}

WorldScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

WorldScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

WorldScreen.prototype.getClocksPerFrame = function() {
  return 0.5;
};

WorldScreen.prototype.getMsPerFrame = function() {
  return 1000 / 60;
};

WorldScreen.prototype.getMsUntilClockAbort = function() {
  return this.getMsPerFrame() - 1;
};

WorldScreen.prototype.getPathDuration = function() {
  return 0xffff;
};

/**
 * Util method for creating a SpiritConfig in one line.
 * @param type The spirit.type
 * @param ctor The spirit constructor
 * @param {=String} menuItemName the menu item name, or null if this is not part of an editor menu
 *     If this is falsy, then the rest of the argumets can be omitted.
 * @param {=number} group The menu item group
 * @param {=number} rank The menu item rank within the group
 * @param {=Function} factory The function for creating this new item. Defaults to ctor.factory
 * @returns {SpiritConfig}
 */
WorldScreen.prototype.createSpiritConfig = function(type, ctor, menuItemName, group, rank, factory) {
  var model = ctor.createModel();
  var stamp = model.createModelStamp(this.renderer.gl);
  var menuItemConfig = menuItemName ? new MenuItemConfig(menuItemName, group, rank, model, factory || ctor.factory) : null;
  return new SpiritConfig(type, ctor, stamp, menuItemConfig);
};

/**
 * Override this function to always return a map from spirit.type to SpiritConfig. It will only be called once.
 * this.createSpiritConfig() can be used to help.
 * @returns {Object} mapping spirit.type to SpiritConfig.
 */
WorldScreen.prototype.createSpiritConfigs = function() {
  throw new Error("Define createSpiritConfigs");
};

/**
 * Override this to always return the collision hit group name/number map. Only called once.
 * @return {Object} mapping from hit group name to group number.
 */
WorldScreen.prototype.createHitGroups = function() {
  throw new Error("Define createHitGroups");
};

/**
 * Override this to always return the array of array-pairs of hit group numbers, for pairs of things that can collide.
 * @return {Array.<Array>.<number>} Array of two-element arrays, each pair containing two hit-group numbers.
 */
WorldScreen.prototype.createHitPairs = function() {
  throw new Error("Define createHitPairs");
};

/**
 * @return {number} the hit-group number of wall bodies, a constant
 */
WorldScreen.prototype.getWallHitGroup = function() {
  throw new Error("Define getWallHitGroup");
};

/**
 * @return {Camera} the camera
 */
WorldScreen.prototype.getCamera = function() {
  throw new Error("Define getCamera");
};

WorldScreen.prototype.drawScene = function() {
  throw new Error("define drawScene");
};

WorldScreen.prototype.onHitEvent = function(e) {
  throw new Error("define onHitEvent");
};

/**
 * Lazily inits SpiritConfig map.
 * @returns {Object}
 */
WorldScreen.prototype.getSpiritConfigs = function() {
  if (!this.spiritConfigs) {
    this.spiritConfigs = this.createSpiritConfigs();
  }
  return this.spiritConfigs;
};

/**
 * Lazily inits SpiritFactory.
 * @returns {Object}
 */
WorldScreen.prototype.getSpiritFactory = function() {
  if (!this.spiritFactory) {
    this.spiritFactory = new SpiritFactory(this, this.getSpiritConfigs());
  }
  return this.spiritFactory;
};

/**
 * Lazily inits hit groups
 * @returns {Object}
 */
WorldScreen.prototype.getHitGroups = function() {
  if (!this.hitGroups) {
    this.hitGroups = this.createHitGroups();
  }
  return this.hitGroups;
};

/**
 * Lazily inits hit pairs... thou
 * @returns {Object}
 */
WorldScreen.prototype.getHitPairs = function() {
  if (!this.hitPairs) {
    this.hitPairs = this.createHitPairs();
  }
  return this.hitPairs;
};

/**
 * Whether the world has been changed since the last time the bit was set to true
 * @returns {boolean}
 */
WorldScreen.prototype.isDirty = function() {
  return this.dirty;
};

/**
 * True to indicate that the world has changed in an undoable way, false to indicate that the world has been restored
 * from the undo stack and nothing has happened since.
 * @param {boolean} d
 */
WorldScreen.prototype.setDirty = function(d) {
  if (this.dirty != d) {
    this.dirty = d;
  }
};

WorldScreen.prototype.setPaused = function(paused) {
  this.paused = paused;
  if (this.paused) {
    // pause
    this.showPauseMenu();
  } else {
    // resume
    this.hidePauseMenu();
    this.controller.requestAnimation();
  }
};

WorldScreen.prototype.initWorld = function() {
  var groupCount = Object.keys(this.getHitGroups()).length;
  this.world = new World(this.bitSize * BitGrid.BITS, groupCount, this.getHitPairs(), this.getSpiritFactory());
  this.resolver = new HitResolver();
  this.bitGrid = new BitGrid(this.bitSize);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
};

WorldScreen.prototype.getResizeFn = function() {
  var self = this;
  return function() {
    self.controller.requestAnimation();
  }
};

WorldScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  if (listen) {
    window.addEventListener('resize', this.resizeFn);
  } else {
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

WorldScreen.prototype.drawScreen = function(visibility, startTimeMs) {
  stats.add(STAT_NAMES.TO_DRAWSCREEN_MS, performance.now() - startTimeMs);
  if (this.destroyed) {
    console.warn('drawing destroyed screen - ignoring');
    return;
  }
  this.drawStats();
  stats.add(STAT_NAMES.STAT_DRAWING_MS, performance.now() - startTimeMs);

  this.updateViewMatrix();
  this.drawScene();
  stats.add(STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS, performance.now() - startTimeMs);

  if (visibility == 1) {
    if (this.handleInput) {
      this.handleInput();
    }
    this.clock(startTimeMs);
  }
};

WorldScreen.prototype.sampleStats = function() {
};

WorldScreen.prototype.drawStats = function() {
};

WorldScreen.prototype.destroyScreen = function() {
  this.setScreenListening(false);
  this.unloadLevel();
  this.destroyed = true;
};

WorldScreen.prototype.showPauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'block';
  this.canvas.style.cursor = "auto";
};

WorldScreen.prototype.hidePauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'none';
  this.canvas.style.cursor = "";
};

WorldScreen.prototype.clock = function(startTimeMs) {
  if (this.paused) return;
  var endTimeMs = startTimeMs + this.getMsUntilClockAbort();
  var startClock = this.world.now;
  var endClock = this.world.now + this.getClocksPerFrame() * this.timeMultiplier;

  this.somethingMoving = this.isPlaying();
  if (!this.isPlaying()) {
    for (var id in this.world.spirits) {
      if (this.world.bodies[this.world.spirits[id].bodyId].isMoving()) {
        this.somethingMoving = true;
        break;
      }
    }
  }

  if (this.somethingMoving) {
    this.setDirty(true);
    var e = this.world.getNextEvent();
    // Stop if there are no more events to process, or we've moved the game clock far enough ahead
    // to match the amount of wall-time elapsed since the last frame,
    // or (worst case) we're out of time for this frame.

    while (e && e.time <= endClock && performance.now() <= endTimeMs) {
      this.world.processNextEventWthoutFreeing();
      if (e.type == WorldEvent.TYPE_HIT) {
        this.onHitEvent(e);
      }
      e.free();
      // Some events can destroy the screen.
      if (this.destroyed) return;
      e = this.world.getNextEvent();

      // recompute endClock in case an event changed the timeMultiplier
      endClock = Math.max(this.world.now, startClock + this.getClocksPerFrame() * this.timeMultiplier);
    }
    if (!e || e.time > endClock) {
      this.world.now = endClock;
    }
  }
  stats.set(STAT_NAMES.WORLD_TIME, this.world.now);
  if (this.exitEndTime && this.world.now >= this.exitEndTime) {
    this.exitLevel();
  }
};

WorldScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

WorldScreen.prototype.otherBody = function(thisBody, b0, b1) {
  if (thisBody != b0) return b0;
  if (thisBody != b1) return b1;
  return null;
};

WorldScreen.prototype.getSpiritForBody = function(b) {
  return b ? this.world.spirits[b.spiritId] : null;
};

WorldScreen.prototype.bodyIfSpiritType = function(type, b0, opt_b1) {
  var s0 = this.getSpiritForBody(b0);
  if (s0 && s0.type == type) return b0;
  if (opt_b1) {
    var s1 = this.getSpiritForBody(opt_b1);
    if (s1 && s1.type == type) return opt_b1;
  }
  return null;
};

WorldScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

WorldScreen.prototype.startExit = function() {};

WorldScreen.prototype.exitLevel = function() {};

WorldScreen.prototype.handleInput = function() {};

WorldScreen.prototype.getPixelsPerMeter = function() {
  return 0.5 * (this.canvas.height + this.canvas.width) / this.getViewDist();
};

WorldScreen.prototype.updateViewMatrix = function() {
  // scale
  this.viewMatrix.toIdentity();
  var pixelsPerMeter = this.getPixelsPerMeter();
  this.viewMatrix
      .multiply(this.mat44.toScaleOpXYZ(
          pixelsPerMeter / this.canvas.width,
          pixelsPerMeter / this.canvas.height,
          0.2));

  // center
  var camera = this.getCamera();
  this.viewMatrix.multiply(this.mat44.toTranslateOpXYZ(
      -camera.getX(),
      -camera.getY(),
      0));
};

//////////////////////
// Editor API stuff
//////////////////////

WorldScreen.prototype.getBodyPos = function(body, outVec2d) {
  return body.getPosAtTime(this.world.now, outVec2d);
};

WorldScreen.prototype.getCanvas = function() {
  return this.canvas;
};

WorldScreen.prototype.addListener = function(listener) {
  this.listeners.put(listener);
  if (this.listening) {
    listener.startListening();
  }
};

WorldScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getOverlaps(body);
};

WorldScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

WorldScreen.prototype.removeByBodyId = function(bodyId) {
  var body = this.world.getBody(bodyId);
  if (body) {
    if (body.spiritId) {
      this.world.removeSpiritId(body.spiritId);
    }
    this.world.removeBodyId(bodyId);
    this.setDirty(true);
  }
};

WorldScreen.prototype.getWorldTime = function() {
  return this.world.now;
};

WorldScreen.prototype.getViewDist = function() {
  return this.getCamera().getViewDist();
};

WorldScreen.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

WorldScreen.prototype.getPopupEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(WorldScreen.EventLayer.POPUP);
};

WorldScreen.prototype.getHudEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(WorldScreen.EventLayer.HUD);
};

WorldScreen.prototype.getWorldEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(WorldScreen.EventLayer.WORLD);
};

/**
 * If the two spirit types match the spirits in the pair, then this returns the pair, maybe flipped.
 * @param pair A pair of Spirit objects in a two-element array
 * @param spiritType0
 * @param spiritType1
 * @returns null, or the original pair array, maybe with first two elements reversed
 */
WorldScreen.prototype.getSpiritPairMatchingTypes = function(pair, spiritType0, spiritType1) {
  if (!pair[0] || !pair[1]) {
    return null;
  }
  if (pair[0].type == spiritType0 && pair[1].type == spiritType1) {
    return pair;
  }
  if (pair[0].type == spiritType1 && pair[1].type == spiritType0) {
    var temp = pair[0];
    pair[0] = pair[1];
    pair[1] = temp;
    return pair;
  }
  return null;
};

/////////////////
// Spirit APIs //
/////////////////

/**
 * @param {number} hitGroup
 * @param {Vec2d} pos
 * @param {Vec2d} vel
 * @param {number} rad
 * @param {=ScanResponse} opt_resp
 * @returns {number} fraction (0-1) of vel where the hit happened, or -1 if there was no hit.
 */
WorldScreen.prototype.scan = function(hitGroup, pos, vel, rad, opt_resp) {
  var resp = opt_resp || this.scanResp;
  this.scanReq.hitGroup = hitGroup;
  // write the body's position into the req's position slot.
  this.scanReq.pos.set(pos);
  this.scanReq.vel.set(vel);
  this.scanReq.shape = Body.Shape.CIRCLE;
  this.scanReq.rad = rad;
  var retval = -1;
  var hit = this.world.rayscan(this.scanReq, resp);
  if (hit) {
    retval = resp.timeOffset;
  }
  // TODO drawScans is not a great API.
  if (this.drawScans) {
    this.addScanSplash(pos, vel, rad, retval);
  }
  return retval;
};

/**
 * Hacky empty impl to support Game2's test rayscan-drawing feature, which is fun.
 * @param {Vec2d} pos
 * @param {Vec2d} vel
 * @param {number} rad
 * @param {number} result fraction (0-1) of vel where the hit happened, or -1 if there was no hit.
 */
WorldScreen.prototype.addScanSplash = function(pos, vel, rad, result) {};

WorldScreen.prototype.setTimeWarp = function(multiplier) {
  this.timeMultiplier = multiplier;
};

WorldScreen.prototype.now = function() {
  return this.world.now;
};

WorldScreen.prototype.drawSpirits = function() {
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
};

WorldScreen.prototype.drawTerrainPill = function(pos0, pos1, rad, color) {
  var changedCellIds = this.tileGrid.drawTerrainPill(pos0, pos1, rad, color);
  if (changedCellIds.length) {
    this.setDirty(true);
  }
};

WorldScreen.prototype.drawTiles = function() {
  var camera = this.getCamera();
  if (this.tileGrid) {
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTiles(camera.getX(), camera.getY(), this.getPixelsPerGridCell());
  }
};

WorldScreen.prototype.getPixelsPerGridCell = function() {
  return this.bitGrid.bitWorldSize * BitGrid.BITS * this.getPixelsPerMeter();
};

WorldScreen.prototype.approxViewportsFromCamera = function(v) {
  var camera = this.getCamera();
  var ppm = this.getPixelsPerMeter();
  return Math.max(
      Math.abs(camera.getX() - v.x) * ppm / this.canvas.width,
      Math.abs(camera.getY() - v.y) * ppm / this.canvas.height);
};

WorldScreen.prototype.worldToJson = function() {
  var worldJsoner = new WorldJsoner();
  var self = this;
  worldJsoner.setIsBodySerializableFn(function(body) {
    return body.hitGroup != self.getWallHitGroup();
  });
  worldJsoner.roundBodyVelocities(this.world, WorldScreen.ROUND_VELOCITY_TO_NEAREST);
  var json = worldJsoner.worldToJson(this.world);
  json.terrain = this.bitGrid.toJSON();
  json.cameraPos = this.getCamera().cameraPos.toJSON();

  // TODO make less not good
  if (this.editor) {
    this.editor.onWorldToJson(json);
  }
  return json;
};

/**
 * @param {Object} json
 */
WorldScreen.prototype.loadWorldFromJson = function(json) {
  var worldJsoner = new WorldJsoner();
  worldJsoner.loadWorldFromJson(this.world, json);
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
  this.tileGrid.flushTerrainChanges();
  if (this.editor) {
    this.editor.onLoadWorldFromJson(json);
  }
  this.getCamera().cameraPos.set(Vec2d.fromJSON(json.cameraPos));
};

/**
 * Add an object to the world using its SpiritConfig.MenuItemConfig.itemName name,
 * at a position and facing a direction.
 * @param {String} name
 * @param {Vec2d} pos
 * @param {number} dir
 * @return the new spiritId or null
 */
WorldScreen.prototype.addItem = function(name, pos, dir) {
  var configs = this.getSpiritConfigs();
  for (var t in configs) {
    var config = configs[t];
    if (config.menuItemConfig && config.menuItemConfig.itemName == name) {
      var spiritId = config.menuItemConfig.factory(this, config.stamp, pos, dir);
      this.setDirty(true);
      return spiritId;
    }
  }
  return null;
};

WorldScreen.prototype.unloadLevel = function() {
  this.tileGrid.unloadAllCells();
  this.tileGrid = null;
  if (this.world) {
    for (var spiritId in this.world.spirits) {
      var s = this.world.spirits[spiritId];
      var b = this.world.bodies[s.bodyId];
      if (b) {
        this.world.removeBodyId(b.id);
      }
      this.world.removeSpiritId(spiritId);
    }
    this.world = null;
  }
  this.getCamera().setXY(0, 0);
  if (this.editor) {
    this.editor.cursorPos.reset();
    this.editor.cursorVel.reset();
  }
};
