/**
 * @constructor
 * @extends {Screen}
 */
function Game3BaseScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
  Screen.call(this);

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.exitStartTime = 0;
  this.exitEndTime = 0;

  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.glyphs = glyphs;
  this.stamps = stamps;

  this.viewMatrix = new Matrix44();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.sounds = new Sounds(sfx, this.viewMatrix);

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
  this.listening = false;
  this.paused = false;

  this.splasher = new Splasher();
  this.splash = new Splash();

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.hudViewMatrix = new Matrix44();

  this.scanReq = new ScanRequest();
  this.scanResp = new ScanResponse();

  this.listeners = new ArraySet();
  this.eventDistributor = new LayeredEventDistributor(this.canvas, 3);
  this.addListener(this.eventDistributor);
  this.resizeFn = this.getResizeFn();

  this.world = null;

  this.playerAveragePos = new Vec2d();

  this.bitSize = 0.2;
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(0.2, 0.3, 0.6);

  this.timeMultiplier = 1;

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
    e.preventDefault();
  };

  this.fullScreenFn = function(e) {
    e = e || window.event;
    self.controller.requestFullScreen();
    e.preventDefault();
  };

  this.shouldDrawScans = false;

  this.playerChasePolarity = 1;
}
Game3BaseScreen.prototype = new Screen();
Game3BaseScreen.prototype.constructor = Game3BaseScreen;

Game3BaseScreen.WIDGET_RADIUS = 30;
Game3BaseScreen.CAMERA_VIEW_DIST = 30;
Game3BaseScreen.CAMERA_MAX_DIST_FRAC = 0.17;
Game3BaseScreen.CAMERA_MIN_DIST_FRAC = 0.05;

Game3BaseScreen.MS_PER_FRAME = 1000 / 60;
Game3BaseScreen.CLOCKS_PER_FRAME = 0.5;
Game3BaseScreen.PATH_DURATION = 0xffff;

Game3BaseScreen.SpiritType = {
  ANT: 3,
  PLAYER: 4,
  EXIT: 5,
  BULLET: 6
};

Game3BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  PLAYER: 'player',
  EXIT: 'exit'
};

Game3BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};


Game3BaseScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

Game3BaseScreen.prototype.setPaused = function(paused) {
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

Game3BaseScreen.prototype.initSpiritConfigs = function() {
  this.spiritConfigs = {};

  var self = this;
  function addConfig(type, ctor, itemName, group, rank, factory) {
    var model = ctor.createModel();
    var stamp = model.createModelStamp(self.renderer.gl);
    var menuItemConfig = null;
    if (itemName) {
      menuItemConfig = new MenuItemConfig(itemName, group, rank, model, factory);
    }
    self.spiritConfigs[type] = new SpiritConfig(type, ctor, stamp, menuItemConfig);
  }

  // first column
  addConfig(Game3BaseScreen.SpiritType.ANT, AntSpirit,
      Game3BaseScreen.MenuItem.RED_ANT, 0, 0, AntSpirit.factory);

  // second column
  addConfig(Game3BaseScreen.SpiritType.PLAYER, PlayerSpirit,
      Game3BaseScreen.MenuItem.PLAYER, 1, 0, PlayerSpirit.factory);

  addConfig(Game3BaseScreen.SpiritType.EXIT, ExitSpirit,
      Game3BaseScreen.MenuItem.EXIT, 1, 1, ExitSpirit.factory);

  addConfig(Game3BaseScreen.SpiritType.BULLET, BulletSpirit,
      null, -1, -1, BulletSpirit.factory);
};

Game3BaseScreen.Group = {
  EMPTY: 0,
  WALL: 1,
  NEUTRAL: 2,
  CURSOR: 3,
  PLAYER: 4,
  PLAYER_FIRE: 5,
  ENEMY: 6,
  ENEMY_FIRE: 7,
  ENEMY_SCAN: 8,
  EXPLODEY_BITS: 9
};

Game3BaseScreen.prototype.initWorld = function() {
  this.lastPathRefreshTime = -Infinity;

  var groupCount = Object.keys(Game3BaseScreen.Group).length;
  var g = Game3BaseScreen.Group;
  var hitPairs = [
    [g.EMPTY, g.EMPTY],

    [g.NEUTRAL, g.WALL],
    [g.NEUTRAL, g.NEUTRAL],

    [g.CURSOR, g.WALL],
    [g.CURSOR, g.NEUTRAL],

    [g.PLAYER, g.CURSOR],
    [g.PLAYER, g.NEUTRAL],
    [g.PLAYER, g.WALL],
    [g.PLAYER, g.PLAYER],

    [g.PLAYER_FIRE, g.NEUTRAL],
    [g.PLAYER_FIRE, g.WALL],

    [g.ENEMY, g.NEUTRAL],
    [g.ENEMY, g.WALL],
    [g.ENEMY, g.CURSOR],
    [g.ENEMY, g.PLAYER],
    [g.ENEMY, g.PLAYER_FIRE],
    [g.ENEMY, g.ENEMY],

    [g.ENEMY_FIRE, g.WALL],
    [g.ENEMY_FIRE, g.NEUTRAL],
    [g.ENEMY_FIRE, g.PLAYER],

    [g.ENEMY_SCAN, g.WALL],
    [g.ENEMY_SCAN, g.NEUTRAL],
    [g.ENEMY_SCAN, g.PLAYER],
    [g.ENEMY_SCAN, g.ENEMY],

    [g.EXPLODEY_BITS, g.WALL]
  ];

  var spiritFactory = new SpiritFactory(this, this.spiritConfigs);
  this.world = new World(this.bitSize * BitGrid.BITS, groupCount, hitPairs, spiritFactory);

  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.95;

  this.bitGrid = new BitGrid(this.bitSize);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
};

/**
 * @param {Object} json
 */
Game3BaseScreen.prototype.loadWorldFromJson = function(json) {
  var worldJsoner = new WorldJsoner();
  worldJsoner.loadWorldFromJson(this.world, json);
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
  this.tileGrid.flushTerrainChanges();
  if (this.editor) this.editor.cursorPos.set(Vec2d.fromJSON(json.cursorPos));
  this.camera.cameraPos.set(Vec2d.fromJSON(json.cameraPos));
};

Game3BaseScreen.prototype.createTrackball = function() {
  var trackball = new MultiTrackball()
      .addTrackball(
          new TouchTrackball(this.getWorldEventTarget())
              .setStartZoneFunction(function(x, y) { return true; })
              .setPixelMultiplier(0.3))
      .addTrackball(
          new KeyTrackball(
              new KeyStick().setUpRightDownLeftByName(Key.Name.DOWN, Key.Name.RIGHT, Key.Name.UP, Key.Name.LEFT),
              new KeyTrigger().addTriggerKeyByName(Key.Name.SHIFT))
          .setAccel(1.2)
          .setTraction(0.25)
          .setTurboMultiplier(4)
  );
  trackball.setFriction(0.05);
  this.addListener(trackball);
  return trackball;
};

Game3BaseScreen.prototype.createButtonWidgets = function() {
  var widgets = [
    new TriggerWidget(this.getHudEventTarget())
        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
        .setStamp(this.stamps.playerPauseStamp)
        .addTriggerDownListener(this.pauseDownFn)
        .listenToTouch()
        .listenToMousePointer()
        .addTriggerKeyByName(Key.Name.SPACE)];
  for (var i = 0; i < widgets.length; i++) {
    this.addListener(widgets[i]);
  }
  return widgets;
};

Game3BaseScreen.prototype.getResizeFn = function() {
  var self = this;
  return function() {
    self.controller.requestAnimation();
  }
};

Game3BaseScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  if (listen) {
    window.addEventListener('resize', this.resizeFn);
  } else {
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

Game3BaseScreen.prototype.drawScreen = function(visibility) {
  if (this.destroyed) {
    console.warn('drawing destroyed screen - ignoring');
    return;
  }
  this.visibility = visibility;
  this.updateViewMatrix();
  this.drawScene();
  if (this.visibility == 1) {
    this.clock();
  }
};

Game3BaseScreen.prototype.drawScene = function() {};

Game3BaseScreen.prototype.destroyScreen = function() {
  this.setScreenListening(false);
  this.unloadLevel();
  this.destroyed = true;
};

Game3BaseScreen.prototype.showPauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'block';
  this.canvas.style.cursor = "auto";
};

Game3BaseScreen.prototype.hidePauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'none';
  this.canvas.style.cursor = "";
};

Game3BaseScreen.prototype.clock = function() {
  if (this.paused) return;
  var endTimeMs = Date.now() + Game3BaseScreen.MS_PER_FRAME;
  var startClock = this.world.now;
  var endClock = this.world.now + Game3BaseScreen.CLOCKS_PER_FRAME * this.timeMultiplier;

  if (this.handleInput) {
    this.handleInput();
  }

  if (this.lastPathRefreshTime + Game3BaseScreen.PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.pathDurationMax > Game3BaseScreen.PATH_DURATION && b.pathDurationMax != Infinity) {
        b.invalidatePath();
        b.moveToTime(this.world.now);
      }
    }
  }

  var e = this.world.getNextEvent();
  // Stop if there are no more events to process, or we've moved the game clock far enough ahead
  // to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.

  while (e && e.time <= endClock && Date.now() <= endTimeMs) {
    this.world.processNextEvent();
    if (e.type == WorldEvent.TYPE_HIT) {
      this.onHitEvent(e);
    }
    // Some events can destroy the screen.
    if (this.destroyed) return;
    e = this.world.getNextEvent();

    // recompute endClock in case an event changed the timeMultiplier
    endClock = Math.max(this.world.now, startClock + Game3BaseScreen.CLOCKS_PER_FRAME * this.timeMultiplier);
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
  if (this.exitEndTime && this.world.now >= this.exitEndTime) {
    this.exitLevel();
  }
};

Game3BaseScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

Game3BaseScreen.prototype.otherBody = function(thisBody, b0, b1) {
  if (thisBody != b0) return b0;
  if (thisBody != b1) return b1;
  return null;
};

Game3BaseScreen.prototype.getSpiritForBody = function(b) {
  return b ? this.world.spirits[b.spiritId] : null;
};

Game3BaseScreen.prototype.bodyIfSpiritType = function(type, b0, opt_b1) {
  var s0 = this.getSpiritForBody(b0);
  if (s0 && s0.type == type) return b0;
  if (opt_b1) {
    var s1 = this.getSpiritForBody(opt_b1);
    if (s1 && s1.type == type) return opt_b1;
  }
  return null;
};

Game3BaseScreen.prototype.onHitEvent = function(e) {
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var playerBody = this.bodyIfSpiritType(Game3BaseScreen.SpiritType.PLAYER, b0, b1);
    if (playerBody) {
      var playerSpirit = this.getSpiritForBody(playerBody);
      playerSpirit.onHitWall(mag, pos);
      var exitBody = this.bodyIfSpiritType(Game3BaseScreen.SpiritType.EXIT, b0, b1);
      if (exitBody && !this.exitStartTime) {
        this.sounds.exit(this.getAveragePlayerPos());
        this.startExit(exitBody.pathStartPos.x, exitBody.pathStartPos.y);
      }
      var antBody = this.bodyIfSpiritType(Game3BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        playerSpirit.hitAnt(mag);
      }
      if (!exitBody && !antBody) {
        this.sounds.wallThump(pos, mag * 10);
      }
    }

    var bulletBody = this.bodyIfSpiritType(Game3BaseScreen.SpiritType.BULLET, b0, b1);
    if (bulletBody) {
      var bulletSpirit = this.getSpiritForBody(bulletBody);
      var otherBody = this.otherBody(bulletBody, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (!otherSpirit) {
        // wall?
        bulletSpirit.onHitWall(mag, pos);
      } else if (otherSpirit.type == Game3BaseScreen.SpiritType.ANT) {
        otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
        bulletSpirit.onHitEnemy(mag, pos);
      } else if (otherSpirit.type == Game3BaseScreen.SpiritType.BULLET) {
        bulletSpirit.onHitOther(mag, pos);
        otherSpirit.onHitOther(mag);
      } else {
        bulletSpirit.onHitOther(mag, pos);
      }
    }
    vec.free();
  }
};

Game3BaseScreen.prototype.startExit = function() {};

Game3BaseScreen.prototype.exitLevel = function() {};

Game3BaseScreen.prototype.handleInput = function() {
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].handleInput();
  }
};

Game3BaseScreen.prototype.addPlayer = function() {
  var p = new Player();
  var trackball = this.createTrackball();
  var buttons = this.createButtonWidgets();
  p.setControls(trackball, null, null, buttons[0]);
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == Game3BaseScreen.SpiritType.PLAYER) {
      p.addSpirit(spirit);
    }
  }
  this.players.push(p);
};

Game3BaseScreen.prototype.getPixelsPerMeter = function() {
  return 0.5 * (this.canvas.height + this.canvas.width) / this.camera.getViewDist();
};

Game3BaseScreen.prototype.updateViewMatrix = function() {
  // scale
  this.viewMatrix.toIdentity();
  var pixelsPerMeter = this.getPixelsPerMeter();
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


//////////////////////
// Editor API stuff
//////////////////////

Game3BaseScreen.prototype.getBodyPos = function(body, outVec2d) {
  return body.getPosAtTime(this.world.now, outVec2d);
};

Game3BaseScreen.prototype.getCanvas = function() {
  return this.canvas;
};

Game3BaseScreen.prototype.addListener = function(listener) {
  this.listeners.add(listener);
  if (this.listening) {
    listener.startListening();
  }
};

Game3BaseScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getBodyOverlaps(body);
};

Game3BaseScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

Game3BaseScreen.prototype.removeByBodyId = function(bodyId) {
  var body = this.world.getBody(bodyId);
  if (body) {
    if (body.spiritId) {
      this.world.removeSpiritId(body.spiritId);
    }
    this.world.removeBodyId(bodyId);
  }
};

Game3BaseScreen.prototype.getCursorHitGroup = function() {
  return Game3BaseScreen.Group.CURSOR;
};

Game3BaseScreen.prototype.getWallHitGroup = function() {
  return Game3BaseScreen.Group.WALL;
};

Game3BaseScreen.prototype.getWorldTime = function() {
  return this.world.now;
};

Game3BaseScreen.prototype.getViewDist = function() {
  return this.camera.getViewDist();
};

Game3BaseScreen.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

Game3BaseScreen.prototype.getPopupEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(Game3BaseScreen.EventLayer.POPUP);
};

Game3BaseScreen.prototype.getHudEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(Game3BaseScreen.EventLayer.HUD);
};

Game3BaseScreen.prototype.getWorldEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(Game3BaseScreen.EventLayer.WORLD);
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
Game3BaseScreen.prototype.scan = function(hitGroup, pos, vel, rad, opt_resp) {
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
  if (this.shouldDrawScans) {
    this.addScanSplash(pos, vel, rad, retval);
  }
  return retval;
};

Game3BaseScreen.prototype.setTimeWarp = function(multiplier) {
  this.timeMultiplier = multiplier;
};

Game3BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Game3BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

  s.startTime = this.world.now;
  s.duration = 20;

  var x = pos.x;
  var y = pos.y;
  var hit = dist >= 0;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.startPose.pos.setXYZ(x, y, 0);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad, rad, 1);

  s.startPose2.pos.setXYZ(x + dx, y + dy, 0);
  s.endPose2.pos.setXYZ(x + dx, y + dy, 1);
  s.startPose2.scale.setXYZ(rad, rad, 1);
  s.endPose2.scale.setXYZ(rad, rad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  if (dist < 0) {
    s.startColor.setXYZ(0.2, 0.5, 0.2);
    s.endColor.setXYZ(0.02, 0.05, 0.02);
  } else {
    s.startColor.setXYZ(0.8, 0.2, 0.2);
    s.endColor.setXYZ(0.08, 0.02, 0.02);
  }

  this.splasher.addCopy(s);
};

Game3BaseScreen.prototype.now = function() {
  return this.world.now;
};

Game3BaseScreen.prototype.drawSpirits = function() {
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    spirit.onDraw(this.world, this.renderer);
  }
};

Game3BaseScreen.prototype.getAveragePlayerPos = function() {
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == Game3BaseScreen.SpiritType.PLAYER) {
      var body = spirit.getBody(this.world);
      if (body) {
        if (playerCount == 0) {
          this.playerAveragePos.reset();
        }
        this.playerAveragePos.add(this.getBodyPos(body, this.vec2d));
        playerCount++;
      }
    }
  }
  if (playerCount != 0) {
    this.playerAveragePos.scale(1 / playerCount);
  }
  return this.playerAveragePos;
};

///////////////////////////
// Wall manipulation stuff
///////////////////////////

Game3BaseScreen.prototype.drawTerrainPill = function(p1, p2, rad, color) {
  this.tileGrid.drawTerrainPill(p1, p2, rad, color);
};

Game3BaseScreen.prototype.drawTiles = function() {
  if (this.tileGrid) {
    this.renderer.setColorVector(this.levelColorVector).setModelMatrix(this.levelModelMatrix);
    this.tileGrid.drawTiles(this.camera.getX(), this.camera.getY(), this.getPixelsPerGridCell());
  }
};

Game3BaseScreen.prototype.getPixelsPerGridCell = function() {
  return this.bitGrid.bitWorldSize * BitGrid.BITS * this.getPixelsPerMeter();
};

Game3BaseScreen.prototype.approxViewportsFromCamera = function(v) {
  var ppm = this.getPixelsPerMeter();
  return Math.max(
      Math.abs(this.camera.getX() - v.x) * ppm / this.canvas.width,
      Math.abs(this.camera.getY() - v.y) * ppm / this.canvas.height);
};

Game3BaseScreen.prototype.unloadLevel = function() {
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
  this.camera.setXY(0, 0);
  if (this.editor) {
    this.editor.cursorPos.reset();
    this.editor.cursorVel.reset();
  }
};
