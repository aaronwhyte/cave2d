/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game5BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  let glyphs = new Glyphs(new GlyphMaker(0.4, 1.2), true);
  glyphs.initModels();
  let models = new Models(glyphs);

  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx,
      Game5BaseScreen.USE_FANS,
      Game5BaseScreen.SUPPORT_BATCH_DRAWING,
      models);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.02, Infinity, Game5BaseScreen.CAMERA_VIEW_DIST);
  this.camera.followFraction = 0.25;

  this.viewableWorldRect = new Rect();
  this.pixelsPerMeter = 100;

  this.exitStartTime = 0;
  this.exitEndTime = 0;

  this.vec2d = new Vec2d();

  this.lastPathRefreshTime = -Infinity;

  this.hudViewMatrix = new Matrix44();

  this.sounds.setMasterGain(0.5);

  this.models = models;

  this.splashes = new Splashes(this.splasher);

  this.levelColorVector.setRGBA(0.2, 0.3, 0.9, 1);

  this.timeMultiplier = 1;

  this.shouldDrawScans = false;
}
Game5BaseScreen.prototype = new WorldScreen();
Game5BaseScreen.prototype.constructor = Game5BaseScreen;

Game5BaseScreen.WIDGET_RADIUS = 30;

// This only matters for the editor.
Game5BaseScreen.CAMERA_VIEW_DIST = 40;

// Makes distortions smooth by eliminating T-junctions and making tile models more detailed.
Game5BaseScreen.USE_FANS = false;

// Adds support for BatchDrawer drawing.
Game5BaseScreen.SUPPORT_BATCH_DRAWING = true;

Game5BaseScreen.SpiritType = {
  ENTRANCE: 1,
  EXIT: 2,
  PLAYER: 3,
  BULLET: 4,
  ANT: 5
};

Game5BaseScreen.MenuItem = {
  ENTRANCE: 'entrance',
  EXIT: 'exit',
  PLAYER: 'player',
  ANT: 'ant'
};

Game5BaseScreen.prototype.getSpiritConfigs = function() {
  if (!this.spiritConfigs) {
    let sc = {};
    let column = 0;
    let row = 0;
    let self = this;

    function nextColumn() {
      column++;
      row = 0;
    }

    function addToMenu(spiritType, ctor, menuItem, modelId) {
      sc[spiritType] = self.createSpiritConfig2(ctor, menuItem, column, row++, self.models.createModel(modelId));
    }

    let st = Game5BaseScreen.SpiritType;
    let mi = Game5BaseScreen.MenuItem;

    addToMenu(st.ENTRANCE, EntranceSpirit, mi.ENTRANCE, ModelIds.ENTRANCE);
    addToMenu(st.EXIT, ExitSpirit, mi.EXIT, ModelIds.EXIT);
    nextColumn();

    addToMenu(st.ANT, AntSpirit, mi.ANT, ModelIds.ANT);
    nextColumn();

    this.spiritConfigs = sc;
  }
  return this.spiritConfigs;
};

Game5BaseScreen.prototype.getHitGroups = function() {
  return HitGroups;
};

Game5BaseScreen.prototype.getHitPairs = function() {
  if (!this.hitPairs) {
    let g = this.getHitGroups();
    this.hitPairs = [
      [g.EMPTY, g.EMPTY],

      [g.NEUTRAL, g.WALL],
      [g.NEUTRAL, g.NEUTRAL],

      [g.CURSOR, g.EMPTY],
      [g.CURSOR, g.WALL],
      [g.CURSOR, g.NEUTRAL],

      [g.PLAYER, g.WALL],
      [g.PLAYER, g.NEUTRAL],
      [g.PLAYER, g.CURSOR],
      [g.PLAYER, g.PLAYER],

      [g.PLAYER_FIRE, g.WALL],
      [g.PLAYER_FIRE, g.PLAYER],
      [g.PLAYER_FIRE, g.NEUTRAL],

      [g.PLAYER_SCAN, g.WALL],
      [g.PLAYER_SCAN, g.NEUTRAL],
      [g.PLAYER_SCAN, g.PLAYER],

      [g.ENEMY, g.WALL],
      [g.ENEMY, g.NEUTRAL],
      [g.ENEMY, g.CURSOR],
      [g.ENEMY, g.PLAYER],
      [g.ENEMY, g.PLAYER_FIRE],
      [g.ENEMY, g.PLAYER_SCAN],
      [g.ENEMY, g.ENEMY],

      [g.ENEMY_FIRE, g.WALL],
      [g.ENEMY_FIRE, g.NEUTRAL],
      [g.ENEMY_FIRE, g.PLAYER],

      [g.ENEMY_SCAN, g.WALL],
      [g.ENEMY_SCAN, g.NEUTRAL],
      [g.ENEMY_SCAN, g.PLAYER],
      [g.ENEMY_SCAN, g.ENEMY],

      [g.BEAM, g.WALL],
      [g.BEAM, g.NEUTRAL],
      [g.BEAM, g.PLAYER],
      [g.BEAM, g.PLAYER_FIRE],
      [g.BEAM, g.ENEMY],
      [g.BEAM, g.ENEMY_FIRE]
    ];
  }
  return this.hitPairs;
};

Game5BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Game5BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Game5BaseScreen.prototype.initWorld = function() {
  WorldScreen.prototype.initWorld.call(this);
  this.lastPathRefreshTime = -Infinity;

  // Wrap the default resolver in one that knows how to do awesome game stuff.
  let bouncer = this.resolver;
  bouncer.defaultElasticity = 0.95;
  this.resolver = new Game5HitResolver(this, bouncer);

  // Prepare the drawing system
  for (let name in ModelIds) {
    let id = ModelIds[name];
    this.addModel(id, this.models.createModel(id), Renderer.BATCH_MAX);
  }
};

Game5BaseScreen.prototype.getCamera = function() {
  return this.camera;
};

Game5BaseScreen.prototype.addPlayerExplosionSplash = function(pos, color) {
  this.splashes.addPlayerExplosionSplash(this.world.now, pos, color);
};

Game5BaseScreen.prototype.addEnemyExplosion = function(pos, rad, color) {
  this.splashes.addEnemyExplosion(this.world.now, pos, rad, color);
};

Game5BaseScreen.prototype.addBulletMuzzleFlash = function(pos, angPos) {
  this.splashes.addBulletMuzzleFlash(this.world.now, pos, angPos);
};

Game5BaseScreen.prototype.addScanSplash = function(pos, vel, rad, dist) {
  this.splashes.addScanSplash(this.world.now, pos, vel, rad, dist);
};

