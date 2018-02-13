/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game4BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  let glyphs = new Glyphs(new GlyphMaker(0.4, 1.2), true);
  glyphs.initModels();
  let models = new Models(glyphs);

  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx,
      Game4BaseScreen.USE_FANS,
      Game4BaseScreen.SUPPORT_BATCH_DRAWING,
      models);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.02, Infinity, Game4BaseScreen.CAMERA_VIEW_DIST);
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

  this.splashes = new Splashes(this.splasher, this.stamps);

  this.levelColorVector.setRGBA(0.2, 0.3, 0.9, 1);

  this.timeMultiplier = 1;

  this.shouldDrawScans = false;
}
Game4BaseScreen.prototype = new WorldScreen();
Game4BaseScreen.prototype.constructor = Game4BaseScreen;

Game4BaseScreen.WIDGET_RADIUS = 30;

// This only matters for the editor.
Game4BaseScreen.CAMERA_VIEW_DIST = 40;

// Makes distortions smooth by eliminating T-junctions and making tile models more detailed.
Game4BaseScreen.USE_FANS = false;

// Adds support for BatchDrawer drawing.
Game4BaseScreen.SUPPORT_BATCH_DRAWING = true;

Game4BaseScreen.SpiritType = {
  ANT: 3,
  PLAYER: 4,
  EXIT: 5,
  BULLET: 6,
  ENTRANCE: 7,
  INDICATOR: 8,
  ACTIVATOR_GUN: 9,
  ACTIVATOR_BULLET: 10,
  TRACTOR_BULLET: 11,
  ENERGY_BULLET: 12,
  CENTIPEDE: 13,
  MACHINE_GUN: 14,
  SHOTGUN: 15,
  ROGUE_GUN: 16
};

Game4BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  CENTIPEDE: 'centipede',
  PLAYER: 'player',
  ENTRANCE: 'entrance',
  EXIT: 'exit',
  INDICATOR: 'indicator',
  ACTIVATOR_GUN: 'activator_gun',
  MACHINE_GUN: 'machine_gun',
  SHOTGUN: 'shotgun',
  ROGUE_GUN: 'rogue_gun'
};

Game4BaseScreen.prototype.createSpiritConfigs = function() {
  let sc = {};
  let column = 0;
  let row = 0;
  let self = this;

  function nextColumn() {
    column++;
    row = 0;
  }

  function addToMenu(spiritType, ctor, menuItem, modelId) {
    sc[spiritType] = self.createSpiritConfig2(spiritType, ctor, menuItem, column, row++, modelId);
  }

  let st = Game4BaseScreen.SpiritType;
  let mi = Game4BaseScreen.MenuItem;

  addToMenu(st.ENTRANCE, EntranceSpirit, mi.ENTRANCE, ModelIds.ENTRANCE);
  addToMenu(st.EXIT, ExitSpirit, mi.EXIT, ModelIds.EXIT);
  nextColumn();

  addToMenu(st.ANT, AntSpirit, mi.RED_ANT, ModelIds.ANT);
  addToMenu(st.CENTIPEDE, CentipedeSpirit, mi.CENTIPEDE, ModelIds.CENTIPEDE);
  nextColumn();

  addToMenu(st.ACTIVATOR_GUN, ActivatorGunSpirit, mi.ACTIVATOR_GUN, ModelIds.ACTIVATOR_GUN);
  addToMenu(st.INDICATOR, IndicatorSpirit, mi.INDICATOR, ModelIds.INDICATOR);
  nextColumn();

  addToMenu(st.MACHINE_GUN, MachineGunSpirit, mi.MACHINE_GUN, ModelIds.MACHINE_GUN);
  addToMenu(st.SHOTGUN, ShotgunSpirit, mi.SHOTGUN, ModelIds.SHOTGUN);
  addToMenu(st.ROGUE_GUN, RogueGunSpirit, mi.ROGUE_GUN, ModelIds.ROGUE_GUN);
  nextColumn();

  return sc;
};

Game4BaseScreen.prototype.createHitGroups = function() {
  return HitGroups;
};

Game4BaseScreen.prototype.createHitPairs = function() {
  let g = this.getHitGroups();
  return [
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
};

Game4BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Game4BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Game4BaseScreen.prototype.initWorld = function() {
  WorldScreen.prototype.initWorld.call(this);
  this.lastPathRefreshTime = -Infinity;

  // Wrap the default resolver in one that knows how to do awesome game stuff.
  let bouncer = this.resolver;
  bouncer.defaultElasticity = 0.95;
  this.resolver = new Game4HitResolver(this, bouncer);

  // Prepare the drawing system
  for (let name in ModelIds) {
    let id = ModelIds[name];
    this.addModel(id, this.models.createModel(id), Renderer.BATCH_MAX);
  }
};

Game4BaseScreen.prototype.getCamera = function() {
  return this.camera;
};

Game4BaseScreen.prototype.addScanSplash = function(pos, vel, rad, dist) {
  this.splashes.addScanSplash(this.world.now, pos, vel, rad, dist);
};

Game4BaseScreen.prototype.addTractorSeekSplash = function(pulling, pos, vel, rad, dist, color) {
  this.splashes.addTractorSeekSplash(this.world.now, pulling, pos, vel, rad, dist, color);
};

Game4BaseScreen.prototype.addKickHitSplash = function(scanPos, scanVel, resultFraction) {
  this.splashes.addKickHitSplash(this.world.now, scanPos, scanVel, resultFraction);
};

Game4BaseScreen.prototype.addKickMissSplash = function(scanPos, scanVel) {
  this.splashes.addKickMissSplash(this.world.now, scanPos, scanVel);
};

Game4BaseScreen.prototype.addPlayerExplosionSplash = function(pos, color) {
  this.splashes.addPlayerExplosionSplash(this.world.now, pos, color);
};

Game4BaseScreen.prototype.addEnemyExplosion = function(pos, rad, color) {
  this.splashes.addEnemyExplosion(this.world.now, pos, rad, color);
};

Game4BaseScreen.prototype.addBulletMuzzleFlash = function(pos, angPos) {
  this.splashes.addBulletMuzzleFlash(this.world.now, pos, angPos);
};

Game4BaseScreen.prototype.addGrabSplash = function(pos, angPos, targetRad) {
  this.splashes.addGrabSplash(this.world.now, pos, angPos, targetRad);
};