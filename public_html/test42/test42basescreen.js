/**
 * @constructor
 * @extends {WorldScreen}
 */
function Test42BaseScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.levelColorVector = new Vec4(0.3, 0.3, 0.4);
}
Test42BaseScreen.prototype = new WorldScreen();
Test42BaseScreen.prototype.constructor = Test42BaseScreen;

Test42BaseScreen.SpiritType = {
  PLAYER: 1,
  ANT: 2
};

Test42BaseScreen.MenuItem = {
  PLAYER: 'player',
  ANT: 'ant'
};

Test42BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Test42BaseScreen.SpiritType.ANT] = this.createSpiritConfig(
      Test42BaseScreen.SpiritType.ANT, AntSpirit, Test42BaseScreen.MenuItem.ANT, 0, 0, AntSpirit.factory);
  sc[Test42BaseScreen.SpiritType.PLAYER] = this.createSpiritConfig(
      Test42BaseScreen.SpiritType.PLAYER, PlayerSpirit, Test42BaseScreen.MenuItem.PLAYER, 0, 0, PlayerSpirit.factory);
  return sc;
};

Test42BaseScreen.prototype.createHitGroups = function() {
  return {
    EMPTY: 0,
    WALL: 1,
    NEUTRAL: 2,
    CURSOR: 3,
    ENEMY: 4,
    ENEMY_SCAN: 5,
    PLAYER: 6
  };
};

Test42BaseScreen.prototype.createHitPairs = function() {
  var g = this.getHitGroups();
  return [
    [g.EMPTY, g.EMPTY],

    [g.NEUTRAL, g.WALL],
    [g.NEUTRAL, g.NEUTRAL],

    [g.CURSOR, g.WALL],
    [g.CURSOR, g.NEUTRAL],

    [g.ENEMY, g.NEUTRAL],
    [g.ENEMY, g.WALL],
    [g.ENEMY, g.CURSOR],
    [g.ENEMY, g.ENEMY],

    [g.ENEMY_SCAN, g.WALL],
    [g.ENEMY_SCAN, g.NEUTRAL],
    [g.ENEMY_SCAN, g.ENEMY],

    [g.PLAYER, g.NEUTRAL],
    [g.PLAYER, g.WALL],
    [g.PLAYER, g.CURSOR],
    [g.PLAYER, g.ENEMY],
    [g.PLAYER, g.ENEMY_SCAN],
    [g.PLAYER, g.PLAYER]
  ];
};

Test42BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test42BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test42BaseScreen.prototype.createTrackball = function() {
  var trackball = new MultiTrackball()
      .addTrackball(new TouchTrackball(this.getWorldEventTarget())
          .setStartZoneFunction(function(x, y) { return true; }))
      .addTrackball(
          new KeyTrackball(
              new KeyStick().setUpRightDownLeftByName(Key.Name.DOWN, Key.Name.RIGHT, Key.Name.UP, Key.Name.LEFT),
              new KeyTrigger().addTriggerKeyByName(Key.Name.SHIFT))
          .setAccel(0.8)
          .setTraction(0.25)
  );
  trackball.setFriction(0.05);
  this.addListener(trackball);
  return trackball;
};

Test42BaseScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};
