/**
 * @constructor
 * @extends {Screen}
 */
function BaseScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
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

  this.drawScans = false;

  this.playerChasePolarity = 1;
}
BaseScreen.prototype = new Screen();
BaseScreen.prototype.constructor = BaseScreen;

BaseScreen.WIDGET_RADIUS = 30;
BaseScreen.CAMERA_VIEW_DIST = 30;
BaseScreen.CAMERA_MAX_DIST_FRAC = 0.17;
BaseScreen.CAMERA_MIN_DIST_FRAC = 0.05;

BaseScreen.MS_PER_FRAME = 1000 / 60;
BaseScreen.CLOCKS_PER_FRAME = 0.5;
BaseScreen.PATH_DURATION = 0xffff;

BaseScreen.SpiritType = {
  ANT: 3,
  PLAYER: 4,
  EXIT: 5,
  BULLET: 6
};

BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  PLAYER: 'player',
  EXIT: 'exit'
};

BaseScreen.Terrain = {
  WALL: 0,
  FLOOR: 1,
  MIXED: 2
};

BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};

BaseScreen.BIT_SIZE = 0.2;
BaseScreen.WORLD_CELL_SIZE = BaseScreen.BIT_SIZE * BitGrid.BITS;

BaseScreen.EventLayer = {
  POPUP: 0,
  HUD: 1,
  WORLD: 2
};

BaseScreen.prototype.setPaused = function(paused) {
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

BaseScreen.prototype.initSpiritConfigs = function() {
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
  addConfig(BaseScreen.SpiritType.ANT, AntSpirit,
      BaseScreen.MenuItem.RED_ANT, 0, 0, AntSpirit.factory);

  // second column
  addConfig(BaseScreen.SpiritType.PLAYER, PlayerSpirit,
      BaseScreen.MenuItem.PLAYER, 1, 0, PlayerSpirit.factory);

  addConfig(BaseScreen.SpiritType.EXIT, ExitSpirit,
      BaseScreen.MenuItem.EXIT, 1, 1, ExitSpirit.factory);

  addConfig(BaseScreen.SpiritType.BULLET, BulletSpirit,
      null, -1, -1, BulletSpirit.factory);
};

BaseScreen.Group = {
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

BaseScreen.prototype.initWorld = function() {
  this.lastPathRefreshTime = -Infinity;

  var groupCount = Object.keys(BaseScreen.Group).length;
  var g = BaseScreen.Group;
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

  this.world = new World(BaseScreen.WORLD_CELL_SIZE, groupCount, hitPairs);

  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.95;

  this.bitGrid = new BitGrid(BaseScreen.BIT_SIZE);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
};

/**
 * @param {Object} json
 */
BaseScreen.prototype.loadWorldFromJson = function (json) {
  this.world.now = json.now;

  // bodies
  var lostSpiritIdToBodyId = {};
  for (var i = 0; i < json.bodies.length; i++) {
    var bodyJson = json.bodies[i];
    var body = new Body();
    body.setFromJSON(bodyJson);
    this.world.loadBody(body);
    lostSpiritIdToBodyId[body.spiritId] = body.id;
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
    delete lostSpiritIdToBodyId[spirit.id];
  }

  // timeouts
  var e = new WorldEvent();
  for (var i = 0; i < json.timeouts.length; i++) {
    e.setFromJSON(json.timeouts[i]);
    this.world.loadTimeout(e);
  }

  // terrain
  // TODO: tileGrid.setFromJSON(json.terrain); and that's it.
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
  this.tileGrid.flushTerrainChanges();

  // cursor and camera
  if (this.editor) this.editor.cursorPos.set(Vec2d.fromJSON(json.cursorPos));
  this.camera.cameraPos.set(Vec2d.fromJSON(json.cameraPos));

//  // splashes
//  var splash = new Splash();
//  for (var i = 0; i < json.splashes.length; i++) {
//    var splashJson = json.splashes[i];
//    var splashType = splashJson[0];
//    // TODO: splashConfig plugin, like spiritConfig
//  }

  // Stop spiritless bodies from haunting the world.
  // This can happen if I add spirits to a level, then remove the definition.
  // TODO: something better
  for (var spiritId in lostSpiritIdToBodyId) {
    var bodyId = lostSpiritIdToBodyId[spiritId];
    this.world.removeBodyId(bodyId);
  }
};

BaseScreen.prototype.createTrackball = function() {
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

BaseScreen.prototype.createButtonWidgets = function() {
  var widgets = [
//    new TriggerWidget(this.getHudEventTarget())
//        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
//        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
//        .setStamp(this.stamps.circleStamp)
//        .listenToTouch()
//        .addTriggerKeyByName('z')
//        .setKeyboardTipStamp(this.stamps['Z']),
//    new TriggerWidget(this.getHudEventTarget())
//        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
//        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
//        .setStamp(this.stamps.circleStamp)
//        .listenToTouch()
//        .addTriggerKeyByName('x')
//        .setKeyboardTipStamp(this.stamps['X']),
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

BaseScreen.prototype.getResizeFn = function() {
  var self = this;
  return function() {
    self.controller.requestAnimation();
  }
};

BaseScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  if (listen) {
    window.addEventListener('resize', this.resizeFn);
  } else {
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

BaseScreen.prototype.drawScreen = function(visibility) {
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

BaseScreen.prototype.drawScene = function() {};

BaseScreen.prototype.destroyScreen = function() {
  this.setScreenListening(false);
  this.unloadLevel();
  this.destroyed = true;
};

BaseScreen.prototype.showPauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'block';
  this.canvas.style.cursor = "auto";
};

BaseScreen.prototype.hidePauseMenu = function() {
  document.querySelector('#pauseMenu').style.display = 'none';
  this.canvas.style.cursor = "";
};

BaseScreen.prototype.clock = function() {
  if (this.paused) return;
  var endTimeMs = Date.now() + BaseScreen.MS_PER_FRAME;
  var startClock = this.world.now;
  var endClock = this.world.now + BaseScreen.CLOCKS_PER_FRAME * this.timeMultiplier;

  if (this.handleInput) {
    this.handleInput();
  }

  if (this.lastPathRefreshTime + BaseScreen.PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.pathDurationMax > BaseScreen.PATH_DURATION && b.pathDurationMax != Infinity) {
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
    endClock = Math.max(this.world.now, startClock + BaseScreen.CLOCKS_PER_FRAME * this.timeMultiplier);
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
  if (this.exitEndTime && this.world.now >= this.exitEndTime) {
    this.exitLevel();
  }
};

BaseScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

BaseScreen.prototype.otherBody = function(thisBody, b0, b1) {
  if (thisBody != b0) return b0;
  if (thisBody != b1) return b1;
  return null;
};

BaseScreen.prototype.getSpiritForBody = function(b) {
  return b ? this.world.spirits[b.spiritId] : null;
};

BaseScreen.prototype.bodyIfSpiritType = function(type, b0, opt_b1) {
  var s0 = this.getSpiritForBody(b0);
  if (s0 && s0.type == type) return b0;
  if (opt_b1) {
    var s1 = this.getSpiritForBody(opt_b1);
    if (s1 && s1.type == type) return opt_b1;
  }
  return null;
};

BaseScreen.prototype.onHitEvent = function(e) {
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var playerBody = this.bodyIfSpiritType(BaseScreen.SpiritType.PLAYER, b0, b1);
    if (playerBody) {
      var playerSpirit = this.getSpiritForBody(playerBody);
      playerSpirit.onHitWall(mag, pos);
      var exitBody = this.bodyIfSpiritType(BaseScreen.SpiritType.EXIT, b0, b1);
      if (exitBody && !this.exitStartTime) {
        this.sounds.exit(this.getAveragePlayerPos());
        this.startExit(exitBody.pathStartPos.x, exitBody.pathStartPos.y);
      }
      var antBody = this.bodyIfSpiritType(BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        playerSpirit.hitAnt(mag);
      }
      if (!exitBody && !antBody) {
        this.sounds.wallThump(pos, mag * 10);
      }
    }

    var bulletBody = this.bodyIfSpiritType(BaseScreen.SpiritType.BULLET, b0, b1);
    if (bulletBody) {
      var bulletSpirit = this.getSpiritForBody(bulletBody);
      var otherBody = this.otherBody(bulletBody, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (!otherSpirit) {
        // wall?
        bulletSpirit.onHitWall(mag, pos);
      } else if (otherSpirit.type == BaseScreen.SpiritType.ANT) {
        otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
        bulletSpirit.onHitEnemy(mag, pos);
      } else if (otherSpirit.type == BaseScreen.SpiritType.BULLET) {
        bulletSpirit.onHitOther(mag, pos);
        otherSpirit.onHitOther(mag);
      } else {
        bulletSpirit.onHitOther(mag, pos);
      }
    }
    vec.free();
  }
};

BaseScreen.prototype.startExit = function() {};

BaseScreen.prototype.exitLevel = function() {};

BaseScreen.prototype.handleInput = function() {
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].handleInput();
  }
};

BaseScreen.prototype.addPlayer = function() {
  var p = new Player();
  var trackball = this.createTrackball();
  var buttons = this.createButtonWidgets();
  p.setControls(trackball, null, null, buttons[0]);
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
      p.addSpirit(spirit);
    }
  }
  this.players.push(p);
};

BaseScreen.prototype.getPixelsPerMeter = function() {
  return 0.5 * (this.canvas.height + this.canvas.width) / this.camera.getViewDist();
};

BaseScreen.prototype.updateViewMatrix = function() {
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

BaseScreen.prototype.getBodyPos = function(body, outVec2d) {
  return body.getPosAtTime(this.world.now, outVec2d);
};

BaseScreen.prototype.getCanvas = function() {
  return this.canvas;
};

BaseScreen.prototype.addListener = function(listener) {
  this.listeners.put(listener);
  if (this.listening) {
    listener.startListening();
  }
};

BaseScreen.prototype.getBodyOverlaps = function(body) {
  return this.world.getOverlaps(body);
};

BaseScreen.prototype.getBodyById = function(id) {
  return this.world.bodies[id];
};

BaseScreen.prototype.removeByBodyId = function(bodyId) {
  var body = this.world.getBody(bodyId);
  if (body) {
    if (body.spiritId) {
      this.world.removeSpiritId(body.spiritId);
    }
    this.world.removeBodyId(bodyId);
  }
};

BaseScreen.prototype.getCursorHitGroup = function() {
  return BaseScreen.Group.CURSOR;
};

BaseScreen.prototype.getWallHitGroup = function() {
  return BaseScreen.Group.WALL;
};

BaseScreen.prototype.getWorldTime = function() {
  return this.world.now;
};

BaseScreen.prototype.getViewDist = function() {
  return this.camera.getViewDist();
};

BaseScreen.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

BaseScreen.prototype.getPopupEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(BaseScreen.EventLayer.POPUP);
};

BaseScreen.prototype.getHudEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(BaseScreen.EventLayer.HUD);
};

BaseScreen.prototype.getWorldEventTarget = function() {
  return this.eventDistributor.getFakeLayerElement(BaseScreen.EventLayer.WORLD);
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
BaseScreen.prototype.scan = function(hitGroup, pos, vel, rad, opt_resp) {
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
  if (this.drawScans) {
    this.addScanSplash(pos, vel, rad, retval);
  }
  return retval;
};

BaseScreen.prototype.setTimeWarp = function(multiplier) {
  this.timeMultiplier = multiplier;
};

BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

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

BaseScreen.prototype.now = function() {
  return this.world.now;
};

BaseScreen.prototype.drawSpirits = function() {
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    spirit.onDraw(this.world, this.renderer);
  }
};

BaseScreen.prototype.getAveragePlayerPos = function() {
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
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

BaseScreen.prototype.drawTerrainPill = function(p1, p2, rad, color) {
  this.tileGrid.drawTerrainPill(p1, p2, rad, color);
};

BaseScreen.prototype.flushTerrainChanges = function() {
  this.tileGrid.flushTerrainChanges();
};

BaseScreen.prototype.drawTiles = function() {
  if (!this.tileGrid) {
    return;
  }
  this.renderer
      .setColorVector(this.levelColorVector)
      .setModelMatrix(this.levelModelMatrix);
  var cx = Math.round((this.camera.getX() - 0.5 * this.bitGrid.cellWorldSize) / this.bitGrid.cellWorldSize);
  var cy = Math.round((this.camera.getY() - 0.5 * this.bitGrid.cellWorldSize) / this.bitGrid.cellWorldSize);
  var pixelsPerMeter = this.getPixelsPerMeter();
  var pixelsPerCell = this.bitGrid.bitWorldSize * BitGrid.BITS * pixelsPerMeter;
  var cellsPerScreenX = 0.5 + this.canvas.width / pixelsPerCell;
  var cellsPerScreenY = 0.5 + this.canvas.height / pixelsPerCell;
  var rx = Math.ceil(cellsPerScreenX);
  var ry = Math.ceil(cellsPerScreenY);
  for (var dy = -ry; dy <= ry; dy++) {
    for (var dx = -rx; dx <= rx; dx++) {
      var stamp = this.tileGrid.getStampAtCellXY(cx + dx, cy + dy);
      if (stamp) {
        this.renderer
            .setStamp(stamp)
            .drawStamp();
      }
    }
  }
};

BaseScreen.prototype.approxViewportsFromCamera = function(v) {
  var ppm = this.getPixelsPerMeter();
  return Math.max(
      Math.abs(this.camera.getX() - v.x) * ppm / this.canvas.width,
      Math.abs(this.camera.getY() - v.y) * ppm / this.canvas.height);
};

BaseScreen.prototype.unloadLevel = function() {
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
