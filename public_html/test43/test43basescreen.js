/**
 * @constructor
 * @extends {WorldScreen}
 */
function Test43BaseScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.levelColorVector = new Vec4(0.3, 0.3, 0.4);
}
Test43BaseScreen.prototype = new WorldScreen();
Test43BaseScreen.prototype.constructor = Test43BaseScreen;

Test43BaseScreen.SpiritType = {
  PLAYER: 1,
  ANT: 2
};

Test43BaseScreen.MenuItem = {
  PLAYER: 'player',
  ANT: 'ant'
};

Test43BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Test43BaseScreen.SpiritType.ANT] = this.createSpiritConfig(
      Test43BaseScreen.SpiritType.ANT, AntSpirit, Test43BaseScreen.MenuItem.ANT, 0, 0);
  sc[Test43BaseScreen.SpiritType.PLAYER] = this.createSpiritConfig(
      Test43BaseScreen.SpiritType.PLAYER, PlayerSpirit, Test43BaseScreen.MenuItem.PLAYER, 0, 0);
  return sc;
};

Test43BaseScreen.prototype.createHitGroups = function() {
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

Test43BaseScreen.prototype.createHitPairs = function() {
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

Test43BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test43BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test43BaseScreen.prototype.createTrackball = function() {
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

Test43BaseScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};
