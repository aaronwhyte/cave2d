/**
 * @constructor
 * @extends {WorldScreen}
 */
function Test44BaseScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.levelColorVector = new Vec4(0.3, 0.3, 0.4);

  this.initStatMons();
  this.drawLeftGraphs = false;
  this.drawRightGraphs = false;
}
Test44BaseScreen.prototype = new WorldScreen();
Test44BaseScreen.prototype.constructor = Test44BaseScreen;

Test44BaseScreen.SpiritType = {
  PLAYER: 1,
  ANT: 2,
  BALL: 3,
  ROCK: 4
};

Test44BaseScreen.MenuItem = {
  PLAYER: 'player',
  ANT: 'ant',
  BALL: 'ball',
  ROCK: 'rock'
};

Test44BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};

Test44BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Test44BaseScreen.SpiritType.ANT] = this.createSpiritConfig(
      Test44BaseScreen.SpiritType.ANT, AntSpirit, Test44BaseScreen.MenuItem.ANT, 0, 0, AntSpirit.factory);

  sc[Test44BaseScreen.SpiritType.PLAYER] = this.createSpiritConfig(
      Test44BaseScreen.SpiritType.PLAYER, PlayerSpirit, Test44BaseScreen.MenuItem.PLAYER, 0, 1, PlayerSpirit.factory);

  sc[Test44BaseScreen.SpiritType.BALL] = this.createSpiritConfig(
      Test44BaseScreen.SpiritType.BALL, BallSpirit, Test44BaseScreen.MenuItem.BALL, 1, 0, BallSpirit.factory);

  sc[Test44BaseScreen.SpiritType.ROCK] = this.createSpiritConfig(
      Test44BaseScreen.SpiritType.ROCK, RockSpirit, Test44BaseScreen.MenuItem.ROCK, 1, 1, RockSpirit.factory);

  return sc;
};

Test44BaseScreen.prototype.createHitGroups = function() {
  return HitGroups;
};

Test44BaseScreen.prototype.createHitPairs = function() {
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
    [g.PLAYER, g.PLAYER],

    [g.PLAYER_SCAN, g.NEUTRAL],
    [g.PLAYER_SCAN, g.WALL],
    [g.PLAYER_SCAN, g.ENEMY],
    [g.PLAYER_SCAN, g.PLAYER]
  ];
};

Test44BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test44BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test44BaseScreen.prototype.createTrackball = function() {
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

Test44BaseScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Test44BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Test44BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

  s.startTime = this.world.now;
  s.duration = 3;

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

Test44BaseScreen.prototype.addTractorSeekSplash = function (pos, vel, rad, dist, color) {
  var s = this.splash;
  s.reset(Test44BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

  s.startTime = this.world.now;
  s.duration = 2;

  var x = pos.x;
  var y = pos.y;
  var hit = dist >= 0;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.startPose.pos.setXYZ(x + dx, y + dy, 1);
  var r = Math.random();
  var b = (r < 0.05) ? 0.4 : 1;
  if (r < 0.1) {
    s.duration = 10;
  }
  s.endPose.pos.setXYZ(x + dx * b, y + dy * b, 0);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad * (r*0.8 + 0.2), rad * (r*0.8 + 0.2), 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};

Test44BaseScreen.prototype.addKickHoldSplash = function(pos, baseVel, addVel, rad, color) {
  var s = this.splash;
  s.reset(Test44BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

  s.startTime = this.world.now;
  s.duration = 4 + Math.random();

  var x = pos.x;
  var y = pos.y;

  var r = Math.random();
  var b = (r < 0.06) ? 3 : r;
  if (r < 0.09) {
    s.duration *= 2;
    addVel.scale(1/2);
  }
  s.startPose.pos.setXYZ(x, y, 1);
  s.endPose.pos.setXYZ(x + (baseVel.x + addVel.x * b) * s.duration, y + (baseVel.y + addVel.y * b) * s.duration, 0);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad / 10, rad / 10, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};

