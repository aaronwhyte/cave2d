/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game6BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  let glyphs = new Glyphs(new GlyphMaker(0.4, 1.2), true);
  glyphs.initModels();
  let models = new Models(glyphs);

  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx,
      Game6BaseScreen.USE_FANS,
      Game6BaseScreen.SUPPORT_BATCH_DRAWING,
      models);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.02, Infinity, Game6BaseScreen.CAMERA_VIEW_DIST);
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
  this.levelColorVector.setRGBA(0.5 - Math.random() * 0.2, 0.5 - Math.random() * 0.2, 0.5 - Math.random() * 0.2, 1);
  this.timeMultiplier = 1;

  this.shouldDrawScans = false;
}
Game6BaseScreen.prototype = new WorldScreen();
Game6BaseScreen.prototype.constructor = Game6BaseScreen;

Game6BaseScreen.WIDGET_RADIUS = 30;

// This only matters for the editor.
Game6BaseScreen.CAMERA_VIEW_DIST = 40;

// Makes distortions smooth by eliminating T-junctions and making tile models more detailed.
Game6BaseScreen.USE_FANS = false;

// Adds support for BatchDrawer drawing.
Game6BaseScreen.SUPPORT_BATCH_DRAWING = true;

Game6BaseScreen.prototype.getSpiritConfigs = function() {
  if (!this.spiritConfigs) {
    this.spiritConfigs = {};
    let column = 0, row = 0, self = this;

    function nextColumn() {
      column++;
      row = 0;
    }

    function addToMenu(key) {
      self.spiritConfigs[key] = self.createSpiritConfig2(
          g5db.getSpiritCtor(key),
          key, column, row++,
          self.models.createModel(g5db.getModelId(key)));
    }

    addToMenu(Game6Key.ENTRANCE);
    addToMenu(Game6Key.EXIT);
    nextColumn();

    addToMenu(Game6Key.ANT);
    addToMenu(Game6Key.MINE);
    nextColumn();

    addToMenu(Game6Key.SLOW_SHOOTER);
    addToMenu(Game6Key.MEDIUM_SHOOTER);
    addToMenu(Game6Key.LASER_WEAPON);
    nextColumn();
  }
  return this.spiritConfigs;
};

Game6BaseScreen.prototype.getHitGroups = function() {
  return HitGroups;
};

Game6BaseScreen.prototype.getHitPairs = function() {
  if (!this.hitPairs) {
    let g = this.getHitGroups();
    this.hitPairs = [
        // g.WALL doesn't hit itself

        [g.NEUTRAL, g.WALL],
        [g.NEUTRAL, g.NEUTRAL],

        [g.NEUTRAL_FIRE, g.WALL],
        [g.NEUTRAL_FIRE, g.NEUTRAL],

        [g.CURSOR, g.EMPTY],
        [g.CURSOR, g.WALL],
        [g.CURSOR, g.NEUTRAL],

        [g.PLAYER, g.WALL],
        [g.PLAYER, g.NEUTRAL],
        [g.PLAYER, g.NEUTRAL_FIRE],
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
        [g.ENEMY, g.NEUTRAL_FIRE],
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

        [g.PLAYER_WIDE_SCAN, g.ENEMY],
        [g.ENEMY_WIDE_SCAN, g.PLAYER],

        [g.EMPTY, g.EMPTY]
    ];
  }
  return this.hitPairs;
};

Game6BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Game6BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Game6BaseScreen.prototype.initWorld = function() {
  WorldScreen.prototype.initWorld.call(this);
  this.lastPathRefreshTime = -Infinity;

  // Wrap the default resolver in one that knows how to do awesome game stuff.
  let bouncer = this.resolver;
  bouncer.defaultElasticity = 0.95;
  this.resolver = new Game6HitResolver(this, bouncer);

  // Prepare the drawing system
  for (let name in ModelId) {
    let id = ModelId[name];
    this.addModel(id, this.models.createModel(id), Renderer.BATCH_MAX);
  }
};

Game6BaseScreen.prototype.getCamera = function() {
  return this.camera;
};

Game6BaseScreen.prototype.addScanSplash = function(pos, vel, rad, dist) {
  this.splashes.addScanSplash(this.world.now, pos, vel, rad, dist);
};

