/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game4BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.05, Infinity, Game4BaseScreen.CAMERA_VIEW_DIST);
  this.viewableWorldRect = new Rect();
  this.pixelsPerMeter = 100;

  this.exitStartTime = 0;
  this.exitEndTime = 0;

  this.vec2d = new Vec2d();

  this.lastPathRefreshTime = -Infinity;

  this.hudViewMatrix = new Matrix44();

  this.sounds.setMasterGain(0.5);

  this.splashes = new Splashes(this.splasher, this.stamps);

  this.levelColorVector.setRGBA(0.2, 0.3, 0.8, 1);

  this.timeMultiplier = 1;

  this.initStatMons();

  this.drawScans = false;
  this.drawLeftGraphs = false;
  this.drawRightGraphs = false;
}
Game4BaseScreen.prototype = new WorldScreen();
Game4BaseScreen.prototype.constructor = Game4BaseScreen;

Game4BaseScreen.WIDGET_RADIUS = 30;
Game4BaseScreen.CAMERA_VIEW_DIST = 25;

Game4BaseScreen.SpiritType = {
  ANT: 3,
  PLAYER: 4,
  EXIT: 5,
  BULLET: 6,
  ENTRANCE: 7,
  INDICATOR: 8,
  ACTIVATOR_GUN: 9,
  ACTIVATOR_BULLET: 10
};

Game4BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  PLAYER: 'player',
  ENTRANCE: 'entrance',
  EXIT: 'exit',
  INDICATOR: 'indicator',
  ACTIVATOR_GUN: 'activator_gun'
};

Game4BaseScreen.prototype.createSpiritConfigs = function() {
  var st = Game4BaseScreen.SpiritType;
  var mi = Game4BaseScreen.MenuItem;
  var a  = [
    [st.ENTRANCE, EntranceSpirit, mi.ENTRANCE, 0, 0],
    [st.EXIT, ExitSpirit, mi.EXIT, 0, 1],
    [st.ANT, AntSpirit, mi.RED_ANT, 1, 0],
    [st.INDICATOR, IndicatorSpirit, mi.INDICATOR, 2, 0],
    [st.ACTIVATOR_GUN, ActivatorGunSpirit, mi.ACTIVATOR_GUN, 2, 1],

    [st.PLAYER, PlayerSpirit, mi.PLAYER],
    [st.BULLET, BulletSpirit],
    [st.ACTIVATOR_BULLET, ActivatorBulletSpirit]
  ];
  var sc = {};
  for (var i = 0; i < a.length; i++) {
    var p = a[i];
    sc[p[0]] = this.createSpiritConfig(p[0], p[1], p[2], p[3], p[4]);
  }
  return sc;
};

Game4BaseScreen.prototype.createHitGroups = function() {
  return HitGroups;
};

Game4BaseScreen.prototype.createHitPairs = function() {
  var g = this.getHitGroups();
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
  this.resolver.defaultElasticity = 0.95;
};

Game4BaseScreen.prototype.getCamera = function() {
  return this.camera;
};

Game4BaseScreen.prototype.onHitEvent = function(e) {
};

Game4BaseScreen.prototype.addScanSplash = function(pos, vel, rad, dist) {
  this.splashes.addScanSplash(this.world.now, pos, vel, rad, dist);
};

Game4BaseScreen.prototype.addTractorSeekSplash = function(pos, vel, rad, dist, color) {
  this.splashes.addTractorSeekSplash(this.world.now, pos, vel, rad, dist, color);
};

Game4BaseScreen.prototype.addTractorRepelSplash = function(pos, angle, vel, rad, dist, color, timeFrac) {
  this.splashes.addTractorRepelSplash(this.world.now, pos, angle, vel, rad, dist, color, timeFrac);
};

Game4BaseScreen.prototype.addPlayerExplosionSplash = function(pos, color) {
  this.splashes.addPlayerExplosionSplash(this.world.now, pos, color);
};

Game4BaseScreen.prototype.addPortalMoteSplash = function(portalCenter, stamp, startRad, endRad) {
  this.splashes.addPortalMoteSplash(this.world.now, portalCenter, stamp, startRad, endRad);
};