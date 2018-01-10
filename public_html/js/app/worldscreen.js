/**
 * Extensible base-class for Screens that mainly wrap a World.
 * @constructor
 * @extends Screen
 */
function WorldScreen(controller, canvas, renderer, stamps, sfx, opt_useFans) {
  if (!controller) return; // generating prototype
  Screen.call(this);

  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.stamps = stamps;

  this.viewMatrix = new Matrix44();
  this.mat44 = new Matrix44();

  this.sounds = new Sounds(sfx, this.viewMatrix);
  this.useFans = !!opt_useFans;

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

  let self = this;

  this.pauseDownFn = function(e) {
    e = e || window.event;
    self.setPaused(!self.paused);
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

WorldScreen.MINIMUM_PHYSICS_MS = 2;

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
  return this.getMsPerFrame() - 4;
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
  let model = ctor.createModel();
  let stamp = model.createModelStamp(this.renderer.gl);
  let menuItemConfig = menuItemName ? new MenuItemConfig(menuItemName, group, rank, model, factory || ctor.factory) : null;
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
  if (this.dirty !== d) {
    this.dirty = d;
  }
};

WorldScreen.prototype.setPaused = function(paused) {
  this.paused = paused;

  this.setPointerLockAllowed(!paused);

  if (this.paused) {
    // pause
    this.showPauseMenu();
  } else {
    // resume
    this.hidePauseMenu();
    this.controller.requestAnimation();
  }
};

WorldScreen.prototype.setPointerLockAllowed = function(allowed) {
  // override me.
};

WorldScreen.prototype.initWorld = function() {
  let groupCount = Object.keys(this.getHitGroups()).length;
  this.world = new World(this.bitSize * BitGrid.BITS, groupCount, this.getHitPairs(), this.getSpiritFactory());
  this.resolver = new HitResolver();
  this.bitGrid = new BitGrid(this.bitSize);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup(), this.useFans);
};

WorldScreen.prototype.getResizeFn = function() {
  let self = this;
  return function() {
    self.controller.requestAnimation();
  }
};

/**
 * @param {boolean} listen
 */
WorldScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  let list = this.listeners.getValues();
  for (let i = 0; i < list.length; i++) {
    if (listen) {
      list[i].startListening();
    } else {
      list[i].stopListening();
    }
  }
  if (listen) {
    window.addEventListener('resize', this.resizeFn);
  } else {
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

WorldScreen.prototype.drawScreen = function(visibility, startTimeMs) {
  stats && stats.add(STAT_NAMES.TO_DRAWSCREEN_MS, performance.now() - startTimeMs);
  if (this.destroyed) {
    console.warn('drawing destroyed screen - ignoring');
    return;
  }
  if (visibility === 1) {
    if (this.handleInput) {
      this.handleInput();
    }
  }

  // update cuboids
  this.canvasCuboid.pos.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0);
  this.canvasCuboid.rad.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0.99);
  for (let i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }

  this.drawStats();
  stats && stats.add(STAT_NAMES.STAT_DRAWING_MS, performance.now() - startTimeMs);

  this.world.validateBodies();

  this.updateViewMatrix();
  this.drawScene();
  stats && stats.add(STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS, performance.now() - startTimeMs);

  if (visibility === 1) {
    this.clock(startTimeMs);
  }
  this.onFrameEnd(startTimeMs);
};

WorldScreen.prototype.destroyScreen = function() {
  this.setScreenListening(false);
  this.unloadLevel();
  this.destroyed = true;
};

WorldScreen.prototype.showPauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'block';
  this.canvas.style.cursor = "auto";

  if (document.pointerLockElement) {
    this.oldPointerLockElement = document.pointerLockElement;
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }
};

WorldScreen.prototype.hidePauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'none';
  this.canvas.style.cursor = "";
  if (this.oldPointerLockElement && this.oldPointerLockElement.requestPointerLock) {
    this.oldPointerLockElement.requestPointerLock();
    this.oldPointerLockElement = null;
  }
};

WorldScreen.prototype.clock = function(startTimeMs) {
  if (this.paused) return;
  let endTimeMs = startTimeMs + this.getMsUntilClockAbort();
  let startClock = this.world.now;
  let endClock = startClock + this.getClocksPerFrame() * this.timeMultiplier;

  this.somethingMoving = this.isPlaying();
  if (!this.isPlaying()) {
    // editing!
    for (let id in this.world.spirits) {
      if (this.world.bodies[this.world.spirits[id].bodyId].isMoving()) {
        this.somethingMoving = true;
        break;
      }
    }
  }

  if (this.somethingMoving) {
    this.setDirty(true);
    // Stop if there are no more events to process, or we've moved the game clock far enough ahead
    // to match the amount of wall-time elapsed since the last frame,
    // or (worst case) we're out of time for this frame.

    // Ensure that if there's not enough time to calculate all the physics, we spend at least *some* time on it,
    // even if that puts us over our frame budget.
    // Otherwise, if drawing takes so much time that there's nothing left for physics afterwards,
    // then we might never make progress on physics again.
    endTimeMs = Math.max(performance.now() + WorldScreen.MINIMUM_PHYSICS_MS, endTimeMs);

    let e = this.world.getNextEvent();
    while (e && e.time <= endClock && performance.now() < endTimeMs) {
      this.world.processNextEventWithoutFreeing();
      if (e.type === WorldEvent.TYPE_HIT) {
        this.onHitEvent(e);
      } else if (e.type === WorldEvent.TYPE_TIMEOUT && !e.spiritId) {
        this.onTimeout(e);
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
  stats && stats.set(STAT_NAMES.WORLD_TIME, this.world.now);
  if (this.exitEndTime && this.world.now >= this.exitEndTime) {
    this.exitLevel();
  }
};

WorldScreen.prototype.onFrameEnd = function(startFrameMs) {
  // Empty by default. Override me maybe?
};

/**
 * Override this to handle null-spirit timeouts in your screen.
 * @param e
 */
WorldScreen.prototype.onTimeout = function(e) {
  console.warn('unhandled WorldScreen timeout event ' + e);
};

WorldScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup === group) return b0;
  if (b1 && b1.hitGroup === group) return b1;
  return null;
};

WorldScreen.prototype.otherBody = function(thisBody, b0, b1) {
  if (thisBody !== b0) return b0;
  if (thisBody !== b1) return b1;
  return null;
};

WorldScreen.prototype.getSpiritById = function(id) {
  return this.world.spirits[id];
};

WorldScreen.prototype.getSpiritForBody = function(b) {
  return b ? this.world.spirits[b.spiritId] : null;
};

WorldScreen.prototype.bodyIfSpiritType = function(type, b0, opt_b1) {
  let s0 = this.getSpiritForBody(b0);
  if (s0 && s0.type === type) return b0;
  if (opt_b1) {
    let s1 = this.getSpiritForBody(opt_b1);
    if (s1 && s1.type === type) return opt_b1;
  }
  return null;
};

WorldScreen.prototype.onHitEvent = function(e) {
  let b0 = this.world.getBodyByPathId(e.pathId0);
  let b1 = this.world.getBodyByPathId(e.pathId1);

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
  let pixelsPerMeter = this.getPixelsPerMeter();
  this.viewMatrix
      .multiply(this.mat44.toScaleOpXYZ(
          pixelsPerMeter / this.canvas.width,
          pixelsPerMeter / this.canvas.height,
          0.2));

  // center
  let camera = this.getCamera();
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

WorldScreen.prototype.addListener = function(listener) {
  this.listeners.add(listener);
  if (this.listening) {
    listener.startListening();
  }
};

WorldScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getBodyOverlaps(body);
};

WorldScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

WorldScreen.prototype.removeByBodyId = function(bodyId) {
  let body = this.world.getBody(bodyId);
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
  if (pair[0].type === spiritType0 && pair[1].type === spiritType1) {
    return pair;
  }
  if (pair[0].type === spiritType1 && pair[1].type === spiritType0) {
    let temp = pair[0];
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
  let resp = opt_resp || this.scanResp;
  this.scanReq.hitGroup = hitGroup;
  // write the body's position into the req's position slot.
  this.scanReq.pos.set(pos);
  this.scanReq.vel.set(vel);
  this.scanReq.shape = Body.Shape.CIRCLE;
  this.scanReq.rad = rad;
  let retval = -1;
  let hit = this.world.rayscan(this.scanReq, resp);
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
  for (let id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
};

WorldScreen.prototype.drawTerrainPill = function(pos0, pos1, rad, color) {
  let changedCellIds = this.tileGrid.drawTerrainPill(pos0, pos1, rad, color);
  if (changedCellIds.length) {
    this.setDirty(true);
  }
};

/**
 * Draws all the tiles that overlap the screen.
 */
WorldScreen.prototype.drawTiles = function() {
  let camera = this.getCamera();
  if (this.tileGrid) {
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTiles(camera.getX(), camera.getY(), this.getPixelsPerGridCell());
  }
};

/**
 * Draws all the tiles that overlap the circles in the array. Array values may be null.
 */
WorldScreen.prototype.drawTilesOverlappingCircles = function(circles) {
  if (this.tileGrid) {
    this.renderer.setTexture(Renderer.TEXTURE_WALL);
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTilesOverlappingCircles(circles);
    this.renderer.setTexture(Renderer.TEXTURE_NONE);
  }
};

WorldScreen.prototype.getPixelsPerGridCell = function() {
  return this.bitGrid.bitWorldSize * BitGrid.BITS * this.getPixelsPerMeter();
};

WorldScreen.prototype.approxViewportsFromCamera = function(v) {
  let camera = this.getCamera();
  let ppm = this.getPixelsPerMeter();
  return Math.max(
      Math.abs(camera.getX() - v.x) * ppm / this.canvas.width,
      Math.abs(camera.getY() - v.y) * ppm / this.canvas.height);
};

WorldScreen.prototype.worldToJson = function() {
  let worldJsoner = new WorldJsoner();
  let self = this;
  worldJsoner.setIsBodySerializableFn(function(body) {
    return body.hitGroup !== self.getWallHitGroup();
  });
  worldJsoner.roundBodyVelocities(this.world, WorldScreen.ROUND_VELOCITY_TO_NEAREST);
  let json = worldJsoner.worldToJson(this.world);
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
  let worldJsoner = new WorldJsoner();
  worldJsoner.loadWorldFromJson(this.world, json);
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup(), this.useFans);
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
  let configs = this.getSpiritConfigs();
  for (let t in configs) {
    let config = configs[t];
    if (config.menuItemConfig && config.menuItemConfig.itemName === name) {
      let spiritId = config.menuItemConfig.factory(this, config.stamp, pos, dir);
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
    for (let spiritId in this.world.spirits) {
      let s = this.world.spirits[spiritId];
      let b = this.world.bodies[s.bodyId];
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


///////////
// Stats //
///////////

WorldScreen.prototype.initStatMons = function() {
  let framesPerRightSample = 3;
  let samplesPerRightGraph = Renderer.POLY_LINE_POINT_COUNT;

  let framesPerLeftSample = Renderer.POLY_LINE_POINT_COUNT;
  let samplesPerLeftGraph = Renderer.POLY_LINE_POINT_COUNT;

  this.statsCuboid = new Cuboid();
  this.bottomRightCuboid = new Cuboid();
  this.topRightCuboid = new Cuboid();
  this.bottomLeftCuboid = new Cuboid();
  this.topLeftCuboid = new Cuboid();

  let graphWidthFrac = 1;
  let dotSize = 8;
  let lineWidth = 2;
  let margin = 0;
  let borderColor = new Vec4(0.6, 0.6, 0.6);
  let stripeColor = borderColor;

  this.cuboidRules.push(new CuboidRule(this.canvasCuboid, this.statsCuboid)
      .setSizingMax(new Vec4(1/2, 1/2, 1), new Vec4(200, 100, Infinity))
      .setAspectRatio(new Vec4(2, 1, 0))
      .setSourceAnchor(new Vec4(1, 1, 0), new Vec4(-margin, -margin, 0))
      .setTargetAnchor(new Vec4(1, 1, 0), new Vec4(0, 0, 0)));

  this.cuboidRules.push(new CuboidRule(this.statsCuboid, this.bottomRightCuboid)
      .setSizingMax(new Vec4(graphWidthFrac / 2, 1/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(1, 1, 0), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1, 1, 0), Vec4.ZERO));
  this.cuboidRules.push(new CuboidRule(this.statsCuboid, this.bottomLeftCuboid)
      .setSizingMax(new Vec4(graphWidthFrac / 2, 1/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(-1, 1, 0), new Vec4(-margin, 0, 0))
      .setTargetAnchor(new Vec4(-1, 1, 0), Vec4.ZERO));

  this.cuboidRules.push(new CuboidRule(this.statsCuboid, this.topRightCuboid)
      .setSizingMax(new Vec4(graphWidthFrac / 2, 3/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(1, -1, 0), new Vec4(0, -margin, 0))
      .setTargetAnchor(new Vec4(1, -1, 0), Vec4.ZERO));
  this.cuboidRules.push(new CuboidRule(this.statsCuboid, this.topLeftCuboid)
      .setSizingMax(new Vec4(graphWidthFrac / 2, 3/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(-1, -1, 0), new Vec4(-margin, -margin, 0))
      .setTargetAnchor(new Vec4(-1, -1, 0), Vec4.ZERO));

  this.rightStatMons = [];
  this.leftStatMons = [];
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.WORLD_TIME,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getClocksPerFrame(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.bottomRightCuboid)
      .setBorderColor(stripeColor)
      .setGraphColor(new Vec4(1, 1, 1))
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.WORLD_TIME,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getClocksPerFrame(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.bottomLeftCuboid)
      .setBorderColor(borderColor)
      .setGraphColor(new Vec4(1, 1, 1))
      .setLineWidth(lineWidth));

  // PURPLE: overhead to get to draw screen - mostly clearing the screen
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.TO_DRAWSCREEN_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(1, 0, 1))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.TO_DRAWSCREEN_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(1, 0, 1))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // GREEN: ..through the stat drawing itself..
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.STAT_DRAWING_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(0, 1, 0))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.STAT_DRAWING_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(0, 1, 0))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // RED: ..through the scene drawing..
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(1, 0, 0))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(1, 0, 0))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // YELLOW: ..and to the end, which is all physics
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.ANIMATION_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setBorderColor(stripeColor)
      .setGraphColor(new Vec4(1, 1, 0))
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.ANIMATION_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setBorderColor(borderColor)
      .setGraphColor(new Vec4(1, 1, 0))
      .setLineWidth(lineWidth));
  this.drawLeftGraphs = false;
  this.drawRightGraphs = false;
};

WorldScreen.prototype.sampleStats = function() {
  if (this.rightStatMons) {
    for (let i = 0; i < this.rightStatMons.length; i++) {
      this.rightStatMons[i].sample();
    }
  }
  if (this.leftStatMons) {
    for (let i = 0; i < this.leftStatMons.length; i++) {
      this.leftStatMons[i].sample();
    }
  }
};

WorldScreen.prototype.drawStats = function() {
  if (this.drawLeftGraphs && this.leftStatMons) {
    for (let i = 0; i < this.leftStatMons.length; i++) {
      this.leftStatMons[i].draw(this.canvas.width, this.canvas.height);
    }
  }
  if (this.drawRightGraphs && this.rightStatMons) {
    for (let i = 0; i < this.rightStatMons.length; i++) {
      this.rightStatMons[i].draw(this.canvas.width, this.canvas.height);
    }
  }
};
