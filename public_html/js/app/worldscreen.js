/**
 * Extensible base-class for Screens that mainly wrap a World.
 * Some of this is here for backwards compat. It's better to use opt_supportBatchDrawing and opt_models, and not opt_stamps.
 *
 * @param {ScreenPage} controller
 * @param {canvas} canvas
 * @param {Renderer} renderer
 * @param {Object=} opt_stamps  a map from stamp name to stamp, for one-off renderer drawing. Deprecated - use opt_models.
 * @param {SoundFx} sfx
 * @param {boolean=} opt_useFans  true to avoid t-junctions in wall models by creating a lot more vertexes
 * @param {boolean=} opt_supportBatchDrawing  true to use a collection of BatchDrawers instead of drawing one-off stamps
 * @param {Object=} opt_models  a map from modelId to model, to use instead of stamps
 * @constructor
 * @extends Screen
 */
function WorldScreen(controller, canvas, renderer, opt_stamps, sfx, opt_useFans, opt_supportBatchDrawing, opt_models) {
  if (!controller) return; // generating prototype
  Screen.call(this);

  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.stamps = opt_stamps;
  this.models = opt_models || null;

  this.viewMatrix = new Matrix44();
  this.mat44 = new Matrix44();

  this.sounds = new Sounds(sfx, this.viewMatrix);
  this.oldMasterGain = this.sounds.getMasterGain();
  this.useFans = !!opt_useFans;
  this.isBatchDrawingSupported = !!opt_supportBatchDrawing;
  if (this.isBatchDrawingSupported) {
    this.drawPack = new DrawPack(this.renderer);
  }

  // Temps for drawing spirits overlapping circles
  this.cellIdSet = new Set();
  this.spiritIdSet = new Set();

  this.listening = false;
  this.paused = false;

  this.splasher = new Splasher();
  this.splash = new Splash();

  this.pair = [null, null];

  this.scanReq = new ScanRequest();
  this.scanResp = new ScanResponse();

  this.listeners = new Set();
  this.eventDistributor = new LayeredEventDistributor(this.canvas, 3);
  this.addListener(this.eventDistributor);
  this.resizeFn = this.getResizeFn();

  this.world = null;

  this.bitSize = 0.5;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(0.4, 0.4, 0.4);
  this.shouldDrawScans = false;

  this.timeMultiplier = 1;

  // stats
  this.shouldDrawStats = false;
  this.statRenderDrawCount = 0;
  this.glyphs = new Glyphs(new GlyphMaker(0.5, 1), true);
  this.glyphs.initStamps(this.renderer.gl);
  this.printer = new Printer(this.renderer, this.glyphs.stamps);
  let mat4 = new Matrix44();
  this.printerStartMatrix = new Matrix44()
      .multiply(mat4.toTranslateOpXYZ(20, 20, -0.95))
      .multiply(mat4.toScaleOpXYZ(3.6, -3.6, 1));
  this.printerNextCharMatrix = new Matrix44()
      .multiply(mat4.toTranslateOpXYZ(3, 0, 0));
  this.printerNextLineMatrix = new Matrix44()
      .multiply(mat4.toTranslateOpXYZ(0, -5.5, 0));

  // gap between RAF callback start time and actual code execution
  this.startDelayMs = 0;
  this.startDelayMsRateStat = new RateStat();
  this.startDelayMsAvgStat = new MovingAverageStat(0.05);

  // Time to handle player inputs
  this.handleInputMs = 0;
  this.handleInputMsRateStat = new RateStat();
  this.handleInputMsAvgStat = new MovingAverageStat(0.05);

  this.drawCountRateStat = new RateStat();
  this.drawCountAvgStat = new MovingAverageStat(0.05);

  // frames per second
  this.frameCount = 0;
  this.fpsRateStat = new RateStat();
  this.fpsAvgStat = new MovingAverageStat(0.05);

  // clocks per frame; clock value is world.now
  this.cpfRateStat = new RateStat();
  this.cpfAvgStat = new MovingAverageStat(0.05);

  // body checkHits per frame, tracked in World
  this.bchpfRateStat = new RateStat();
  this.bchpfAvgStat = new MovingAverageStat(0.05);

  // rayscan checkHits per frame, tracked in World
  this.rchpfRateStat = new RateStat();
  this.rchpfAvgStat = new MovingAverageStat(0.05);

  // enter/exit events enqueued per frame, tracked in World
  this.eepfRateStat = new RateStat();
  this.eepfAvgStat = new MovingAverageStat(0.05);

  // timeout events enqueued per frame, tracked in World
  this.toepfRateStat = new RateStat();
  this.toepfAvgStat = new MovingAverageStat(0.05);

  // time to handle and render these stats
  this.statDrawMs = 0;
  this.statDrawMsRateStat = new RateStat();
  this.statDrawMsAvgStat = new MovingAverageStat(0.05);

  // total time to draw game scene
  this.sceneDrawMs = 0;
  this.sceneDrawMsRateStat = new RateStat();
  this.sceneDrawMsAvgStat = new MovingAverageStat(0.05);

  // scene breakdown: walls
  this.wallDrawMs = 0;
  this.wallDrawMsRateStat = new RateStat();
  this.wallDrawMsAvgStat = new MovingAverageStat(0.05);

  // scene breakdown: spirits
  this.spiritDrawMs = 0;
  this.spiritDrawMsRateStat = new RateStat();
  this.spiritDrawMsAvgStat = new MovingAverageStat(0.05);

  // scene breakdown: splashes, recorded inside Splasher
  this.splashDrawMsRateStat = new RateStat();
  this.splashDrawMsAvgStat = new MovingAverageStat(0.2);

  // physics ms per frame, including validateBodies and clock
  this.phyMs = 0;
  this.phyMsRateStat = new RateStat();
  this.phyMsAvgStat = new MovingAverageStat(0.05);

  // all the time we spend on this frame
  this.totalMs = 0;
  this.totalMsRateStat = new RateStat();
  this.totalMsAvgStat = new MovingAverageStat(0.05);

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

WorldScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

WorldScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

WorldScreen.MINIMUM_PHYSICS_MS = 2;
WorldScreen.RELAX_PER_FRAME_MS = 2;

WorldScreen.prototype.getClocksPerFrame = function() {
  return 0.5;
};

WorldScreen.prototype.getMsPerFrame = function() {
  return 1000 / this.fpsAvgStat.getValue();
  // return 1000 / 60;
};

WorldScreen.prototype.getMsUntilClockAbort = function() {
  return this.getMsPerFrame() - WorldScreen.RELAX_PER_FRAME_MS;
};

/**
 * Adds a model, creating a stamp or a batchDrawer depending on batchSize.
 * @param id The caller-defined key. Re-adding something that was already added will cause an error!
 * @param {RigidModel} model
 * @param {number} batchSize If this is less than 2, then a batchDrawer won't be created. Regular stamps will be used.
 */
WorldScreen.prototype.addModel = function(id, model, batchSize) {
  return this.drawPack.addModel(id, model, batchSize);
};

/**
 * @param {number} id
 * @param {Vec4} color
 * @param {Matrix44} matrix
 * @param {Matrix44=} matrix2
 */
WorldScreen.prototype.drawModel = function(id, color, matrix, matrix2) {
  this.drawPack.draw(id, color, matrix, matrix2);
};

WorldScreen.prototype.flushBatchDrawers = function() {
  if (this.isBatchDrawingSupported) {
    this.drawPack.flush();
  }
};

/**
 * Util method for creating a SpiritConfig in one line.
 * @param ctor The spirit constructor. Must have a static factory method
 * @param {=String} menuItemName the menu item name, or null if this is not part of an editor menu
 *     If this is falsy, then the rest of the argumets can be omitted.
 * @param {=number} group The menu item group
 * @param {=number} rank The menu item rank within the group
 * @param {=RigidModel} model for the MenuConfig, if this is a menu item thingy.
 * @returns {SpiritConfig}
 */
WorldScreen.prototype.createSpiritConfig = function(ctor, menuItemName, group, rank, model) {
  let stamp = model.createModelStamp(this.renderer.gl);
  let menuItemConfig = menuItemName ? new MenuItemConfig(menuItemName, group, rank, model, ctor.factory) : null;
  return new SpiritConfig(ctor, stamp, menuItemConfig);
};

/**
 * Util method for creating a SpiritConfig in one line, using one of this screen's modelIds.
 * @param ctor The spirit constructor
 * @param {=String} menuItemName the menu item name, or null if this is not part of an editor menu
 *     If this is falsy, then the rest of the arguments can be omitted.
 * @param {=number} group The menu item group
 * @param {=number} rank The menu item rank within the group
 * @param {=RigidModel} model for the MenuConfig, if this is a menu item thingy.
 * @returns {SpiritConfig}
 */
WorldScreen.prototype.createSpiritConfig2 = function(ctor, menuItemName, group, rank, model) {
  let menuItemConfig = null;
  if (menuItemName) {
    menuItemConfig = new MenuItemConfig(menuItemName, group, rank, model, ctor.factory);
  }
  return new SpiritConfig(ctor, null, menuItemConfig);
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
 * @returns {Object}
 */
WorldScreen.prototype.getSpiritConfigs = function() {
  throw new Error("define getSpiritConfigs");
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
  throw new Error("define getHitGroups");
};

/**
 * Lazily inits hit pairs... thou
 * @returns {Object}
 */
WorldScreen.prototype.getHitPairs = function() {
  throw new Error("define getHitPairs");
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
    this.oldMasterGain = this.sounds.getMasterGain();
    this.sounds.setMasterGain(0);
  } else {
    // resume
    this.hidePauseMenu();
    this.sounds.setMasterGain(this.oldMasterGain);
    this.controller.requestAnimation();
  }
};

WorldScreen.prototype.setPointerLockAllowed = function(allowed) {
  // override me.
};

WorldScreen.prototype.initWorld = function() {
  let groupCount = Object.keys(this.getHitGroups()).length;
  // experimentally determined that "/ 2" is best on an old iPad. But "/ 6" is better on a new laptop. Hm.
  this.world = new World(this.bitSize * BitGrid.BITS / 2, groupCount, this.getHitPairs(), this.getSpiritFactory());
  this.world.addStationaryGroup(this.getWallHitGroup());
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
  this.listeners.forEach(function(listener) {
      if (listen) {
        listener.startListening();
      } else {
        listener.stopListening();
      }
    });
  if (listen) {
    window.addEventListener('resize', this.resizeFn);
  } else {
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

WorldScreen.prototype.drawScreen = function(visibility, startTimeMs) {
  this.startDelayMs += performance.now() - startTimeMs;
  let t;
  this.frameCount++;
  if (this.destroyed) {
    console.warn('drawing destroyed screen - ignoring');
    return;
  }
  t = performance.now();
  if (visibility === 1) {
    if (this.handleInput) {
      this.handleInput();
    }
  }
  this.handleInputMs += performance.now() - t;

  // update cuboids
  this.canvasCuboid.pos.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0);
  this.canvasCuboid.rad.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0.99);
  for (let i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }

  t = performance.now();
  this.drawStats();
  this.statDrawMs += performance.now() - t;

  t = performance.now();
  this.world.validateBodies();
  this.phyMs += performance.now() - t;

  t = performance.now();
  this.updateViewMatrix();
  this.drawScene();
  this.sceneDrawMs += performance.now() - t;

  if (visibility === 1) {
    t = performance.now();
    this.clock(startTimeMs);
    this.phyMs += performance.now() - t;
  }
  this.onFrameEnd(startTimeMs);
  this.totalMs += performance.now() - startTimeMs;
};

WorldScreen.prototype.destroyScreen = function() {
  this.setScreenListening(false);
  this.unloadLevel();
  if (this.sounds.disconnect) {
    this.sounds.disconnect();
  }
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

WorldScreen.prototype.removeSpiritId = function(id) {
  this.world.removeSpiritId(id);
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
  // TODO shouldDrawScans is not a great API.
  if (this.shouldDrawScans) {
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

WorldScreen.prototype.approachTimeWarpLinearly = function(destWarp, linearFactor) {
  let diff = destWarp - this.timeMultiplier;
  if (Math.abs(diff > linearFactor)) {
    diff = Math.sign(diff) * linearFactor;
  }
  this.timeMultiplier += diff;
};

WorldScreen.prototype.now = function() {
  return this.world.now;
};

WorldScreen.prototype.drawSpirits = function() {
  let t = performance.now();
  for (let id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
  if (this.isBatchDrawingSupported) {
    this.flushBatchDrawers();
  }
  this.spiritDrawMs += performance.now() - t;
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
  let t = performance.now();
  let camera = this.getCamera();
  if (this.tileGrid) {
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTiles(camera.getX(), camera.getY(), this.getPixelsPerGridCell());
  }
  this.wallDrawMs += performance.now() - t;
};

/**
 * Draws all the wall tiles that overlap the circles in the array. Array values may be null.
 */
WorldScreen.prototype.drawTilesOverlappingCircles = function(circles) {
  let t = performance.now();
  if (this.tileGrid) {
    this.renderer.setTexture(Renderer.TEXTURE_WALL);
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTilesOverlappingCircles(circles);
    this.renderer.setTexture(Renderer.TEXTURE_NONE);
  }
  this.wallDrawMs += performance.now() - t;
};

/**
 * Draws all the spirits in cells that overlap the circles in the array. Array values may be null.
 */
WorldScreen.prototype.drawSpiritsOverlappingCircles = function(circles) {
  let t = performance.now();
  this.cellIdSet.clear();
  this.spiritIdSet.clear();
  for (let i = 0; i < circles.length; i++) {
    if (circles[i] !== null) {
      this.world.addCellIdsOverlappingCircle(this.cellIdSet, circles[i]);
    }
  }
  let wallHitGroup = this.getWallHitGroup();
  let hitGroupCount = this.world.getGroupCount();
  for (let cellId of this.cellIdSet.keys()) {
    for (let groupNum = 0; groupNum < hitGroupCount; groupNum++) {
      if (groupNum !== wallHitGroup) {
        this.world.addSpiritIdsInCellAndGroup(this.spiritIdSet, cellId, groupNum);
      }
    }
  }
  for (let spiritId of this.spiritIdSet.keys()) {
    let spirit = this.world.spirits[spiritId];
    if (spirit) spirit.onDraw(this.world, this.renderer);
  }

  // HACKish: draw disembodied spirits too, like dead bullets that are still leaving trails
  for (let spiritId in this.world.spirits) {
    let spirit = this.world.spirits[spiritId];
    if (!spirit.bodyId) spirit.onDraw(this.world, this.renderer);
  }

  this.flushBatchDrawers();
  this.spiritDrawMs += performance.now() - t;
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

WorldScreen.prototype.worldToJson = function(opt_ignoreTimeouts) {
  let worldJsoner = new WorldJsoner();
  if (opt_ignoreTimeouts) {
    worldJsoner.serializeTimeouts = false;
  }
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
      let spiritId = config.menuItemConfig.factory(this, pos, dir);
      if (config.stamp) {
        // old-school, before modelIds existed
        let spirit = this.getSpiritById(spiritId);
        spirit.setModelStamp(config.stamp);
      }
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

WorldScreen.prototype.drawStats = function() {
  let fc = this.frameCount;
  function avgRatePerFrame(val, rateStat, avgStat) {
    rateStat.sample(fc, val);
    avgStat.sample(fc, rateStat.getValue());
  }
  this.fpsRateStat.sample(performance.now() / 1000, fc);
  this.fpsAvgStat.sample(fc, this.fpsRateStat.getValue());
  avgRatePerFrame(this.world.now, this.cpfRateStat, this.cpfAvgStat);
  avgRatePerFrame(this.world.bodyCalcHitCount, this.bchpfRateStat, this.bchpfAvgStat);
  avgRatePerFrame(this.world.rayscanCalcHitCount, this.rchpfRateStat, this.rchpfAvgStat);
  avgRatePerFrame(this.world.enterOrExitEnqueuedCount, this.eepfRateStat, this.eepfAvgStat);
  avgRatePerFrame(this.world.addTimeoutCount, this.toepfRateStat, this.toepfAvgStat);

  // Subtract the stat glyph draw count itself, which is in the low hundreds :-(
  avgRatePerFrame(this.renderer.drawCount - this.statRenderDrawCount, this.drawCountRateStat, this.drawCountAvgStat);

  avgRatePerFrame(this.startDelayMs, this.startDelayMsRateStat, this.startDelayMsAvgStat);
  avgRatePerFrame(this.handleInputMs, this.handleInputMsRateStat, this.handleInputMsAvgStat);
  avgRatePerFrame(this.statDrawMs, this.statDrawMsRateStat, this.statDrawMsAvgStat);
  avgRatePerFrame(this.sceneDrawMs, this.sceneDrawMsRateStat, this.sceneDrawMsAvgStat);
  avgRatePerFrame(this.wallDrawMs, this.wallDrawMsRateStat, this.wallDrawMsAvgStat);
  avgRatePerFrame(this.spiritDrawMs, this.spiritDrawMsRateStat, this.spiritDrawMsAvgStat);
  avgRatePerFrame(this.splasher.drawMs, this.splashDrawMsRateStat, this.splashDrawMsAvgStat);
  avgRatePerFrame(this.phyMs, this.phyMsRateStat, this.phyMsAvgStat);
  avgRatePerFrame(this.totalMs, this.totalMsRateStat, this.totalMsAvgStat);

  if (this.shouldDrawStats) {
    let txt =
        "B1" +
        "\n FPS " + Math.round(this.fpsAvgStat.getValue()) +
        "\n   C " + Math.round(100 * this.cpfAvgStat.getValue()) / 100 +
        "\n   D " + Math.round(this.drawCountAvgStat.getValue()) +
        "\n" +
        // "\n DLY " + Math.round(100 * this.startDelayMsAvgStat.getValue()) / 100 +
        "\nSCNE " + Math.round(100 * this.sceneDrawMsAvgStat.getValue()) / 100 +
        "\n       WALL " + Math.round(100 * this.wallDrawMsAvgStat.getValue()) / 100 +
        "\n       SPRT " + Math.round(100 * this.spiritDrawMsAvgStat.getValue()) / 100 +
        "\n       SPLA " + Math.round(100 * this.splashDrawMsAvgStat.getValue()) / 100 +
        "\n PHY " + Math.round(100 * this.phyMsAvgStat.getValue()) / 100 +
        "\n       BCH " + Math.round(this.bchpfAvgStat.getValue()) +
        "\n       RCH " + Math.round(this.rchpfAvgStat.getValue()) +
        // "\nINPT " + Math.round(100 * this.handleInputMsAvgStat.getValue()) / 100 +
        // "\n      TO " + Math.round(this.toepfAvgStat.getValue()) +
        // "\n      EE " + Math.round(this.eepfAvgStat.getValue()) +
        "\nSTAT " + Math.round(100 * this.statDrawMsAvgStat.getValue()) / 100 +
        "\n ALL " + Math.round(100 * this.totalMsAvgStat.getValue()) / 100 +
        "";
    // recalculate viewMatrix
    this.viewMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(-1, 1, 0))
        .multiply(
            this.mat44.toScaleOpXYZ(
                2 / this.canvas.width, -2 / this.canvas.height, 1))
    ;
    this.renderer.setViewMatrix(this.viewMatrix).setColorVector(Renderer.COLOR_WHITE);
    let drawCount = this.renderer.drawCount;
    this.printer.printMultiLine(this.printerStartMatrix, this.printerNextCharMatrix, this.printerNextLineMatrix, txt);
    this.statRenderDrawCount += this.renderer.drawCount - drawCount;
  }
};
