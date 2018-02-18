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

Test41BaseScreen.prototype.getSpiritConfigs = function() {
  if (!this.spiritConfigs) {
    this.spiritConfigs = {};
    this.spiritConfigs[Test41BaseScreen.SpiritType.ANT] =
        this.createSpiritConfig(AntSpirit, Test41BaseScreen.MenuItem.ANT, 0, 0, AntSpirit.createModel());
  }
  return this.spiritConfigs;
};

Test41BaseScreen.prototype.getHitGroups = function() {
  if (!this.hitGroups) {
    this.hitGroups = {
      EMPTY: 0,
      WALL: 1,
      NEUTRAL: 2,
      CURSOR: 3,
      ENEMY: 4,
      ENEMY_SCAN: 5
    };
  }
  return this.hitGroups;
};

Test41BaseScreen.prototype.getHitPairs = function() {
  if (!this.hitPairs) {
    let g = this.getHitGroups();
    this.hitPairs = [
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
  }
  return this.hitPairs;
};

Test41BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test41BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test41BaseScreen.prototype.createTrackball = function() {
  let trackball = new MultiTrackball()
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
