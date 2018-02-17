/**
 * @constructor
 * @extends {WorldScreen}
 */
function Test41BaseScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.levelColorVector = new Vec4(0.4, 0.4, 0.4);
}
Test41BaseScreen.prototype = new WorldScreen();
Test41BaseScreen.prototype.constructor = Test41BaseScreen;

Test41BaseScreen.SpiritType = {
  ANT: 3
};

Test41BaseScreen.MenuItem = {
  ANT: 'ant'
};

Test41BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Test41BaseScreen.SpiritType.ANT] = this.createSpiritConfig(
      Test41BaseScreen.SpiritType.ANT, AntSpirit, Test41BaseScreen.MenuItem.ANT, 0, 0);
  return sc;
};

Test41BaseScreen.prototype.createHitGroups = function() {
  return {
    EMPTY: 0,
    WALL: 1,
    NEUTRAL: 2,
    CURSOR: 3,
    ENEMY: 4,
    ENEMY_SCAN: 5
  };
};

Test41BaseScreen.prototype.createHitPairs = function() {
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
    [g.ENEMY_SCAN, g.ENEMY]
  ];
};

Test41BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test41BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test41BaseScreen.prototype.createTrackball = function() {
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

Test41BaseScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};
