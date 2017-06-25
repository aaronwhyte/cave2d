/**
 * @constructor
 * @extends {WorldScreen}
 */
function Test45BaseScreen(controller, canvas, renderer, stamps, sfx) {
  if (!controller) return; // generating prototype
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.levelColorVector = new Vec4(0.3, 0.3, 0.4);

  this.initStatMons();
}
Test45BaseScreen.prototype = new WorldScreen();
Test45BaseScreen.prototype.constructor = Test45BaseScreen;

Test45BaseScreen.SpiritType = {
  PLAYER: 1,
  ANT: 2,
  BALL: 3,
  ROCK: 4
};

Test45BaseScreen.MenuItem = {
  PLAYER: 'player',
  ANT: 'ant',
  BALL: 'ball',
  ROCK: 'rock'
};

Test45BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};


Test45BaseScreen.prototype.initStatMons = function() {
  var framesPerRightSample = 1;
  var samplesPerRightGraph = 2;

  var framesPerLeftSample = 10;
  var samplesPerLeftGraph = 40;

  this.graphsCuboid = new Cuboid();
  this.bottomRightCuboid = new Cuboid();
  this.topRightCuboid = new Cuboid();
  this.bottomLeftCuboid = new Cuboid();
  this.topLeftCuboid = new Cuboid();

  var graphWidthFrac = 1;
  var dotSize = 8;
  var lineWidth = 2;
  var margin = 14;
  var borderColor = new Vec4(0.6, 0.6, 0.6);
  var stripeColor = borderColor;

  this.cuboidRules.push(new CuboidRule(this.canvasCuboid, this.graphsCuboid)
      .setSizingMax(new Vec4(1/2, 1/2, 1), new Vec4(100, 100, Infinity))
      .setAspectRatio(new Vec4(1, 1, 0))
      .setSourceAnchor(new Vec4(1, 1, 0), new Vec4(-margin, -margin, 0))
      .setTargetAnchor(new Vec4(1, 1, 0), new Vec4(0, 0, 0)));

  this.cuboidRules.push(new CuboidRule(this.graphsCuboid, this.bottomRightCuboid)
      .setSizingMax(new Vec4(0, 1/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(1, 1, 0), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1, 1, 0), Vec4.ZERO));
  this.cuboidRules.push(new CuboidRule(this.graphsCuboid, this.bottomLeftCuboid)
      .setSizingMax(new Vec4(graphWidthFrac, 1/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(-1, 1, 0), new Vec4(-margin, 0, 0))
      .setTargetAnchor(new Vec4(-1, 1, 0), Vec4.ZERO));

  this.cuboidRules.push(new CuboidRule(this.graphsCuboid, this.topRightCuboid)
      .setSizingMax(new Vec4(0, 3/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(1, -1, 0), new Vec4(0, -margin, 0))
      .setTargetAnchor(new Vec4(1, -1, 0), Vec4.ZERO));
  this.cuboidRules.push(new CuboidRule(this.graphsCuboid, this.topLeftCuboid)
      .setSizingMax(new Vec4(graphWidthFrac, 3/4, 1), Vec4.INFINITY)
      .setSourceAnchor(new Vec4(-1, -1, 0), new Vec4(-margin, -margin, 0))
      .setTargetAnchor(new Vec4(-1, -1, 0), Vec4.ZERO));

  this.rightStatMons = [];
  this.leftStatMons = [];
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.WORLD_TIME,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getClocksPerFrame(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.bottomRightCuboid)
      .setBorderColor(stripeColor)
      .setGraphColor(new Vec4(1, 1, 1))
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.WORLD_TIME,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getClocksPerFrame(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.bottomLeftCuboid)
      .setBorderColor(borderColor)
      .setGraphColor(new Vec4(1, 1, 1))
      .setLineWidth(lineWidth));

  // BLUE: overhead to get to draw screen - mostly clearing the screen
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.TO_DRAWSCREEN_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(0, 0, 1))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.TO_DRAWSCREEN_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(0, 0, 1))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // GREEN: ..through the stat drawing itself..
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.STAT_DRAWING_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(0, 1, 0))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.STAT_DRAWING_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(0, 1, 0))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // RED: ..through the scene drawing..
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setGraphColor(new Vec4(1, 0, 0))
      .setBorderWidth(0)
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.SCENE_PLUS_STAT_DRAWING_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setGraphColor(new Vec4(1, 0, 0))
      .setBorderWidth(0)
      .setLineWidth(lineWidth));

  // YELLOW: ..and to the end, which is all physics
  this.rightStatMons.push(new StatMon(
      stats, STAT_NAMES.ANIMATION_MS,
      framesPerRightSample, samplesPerRightGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topRightCuboid)
      .setBorderColor(stripeColor)
      .setGraphColor(new Vec4(1, 1, 0))
      .setLineWidth(dotSize));
  this.leftStatMons.push(new StatMon(
      stats, STAT_NAMES.ANIMATION_MS,
      framesPerLeftSample, samplesPerLeftGraph,
      0, this.getMsUntilClockAbort(),
      this.renderer, new LineDrawer(this.renderer, this.stamps.lineStamp), this.topLeftCuboid)
      .setBorderColor(borderColor)
      .setGraphColor(new Vec4(1, 1, 0))
      .setLineWidth(lineWidth));
  this.drawLeftGraphs = false;
  this.drawRightGraphs = false;
};

Test45BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Test45BaseScreen.SpiritType.ANT] = this.createSpiritConfig(
      Test45BaseScreen.SpiritType.ANT, AntSpirit, Test45BaseScreen.MenuItem.ANT, 0, 0, AntSpirit.factory);

  sc[Test45BaseScreen.SpiritType.PLAYER] = this.createSpiritConfig(
      Test45BaseScreen.SpiritType.PLAYER, PlayerSpirit, Test45BaseScreen.MenuItem.PLAYER, 0, 1, PlayerSpirit.factory);

  sc[Test45BaseScreen.SpiritType.BALL] = this.createSpiritConfig(
      Test45BaseScreen.SpiritType.BALL, BallSpirit, Test45BaseScreen.MenuItem.BALL, 1, 0, BallSpirit.factory);

  sc[Test45BaseScreen.SpiritType.ROCK] = this.createSpiritConfig(
      Test45BaseScreen.SpiritType.ROCK, RockSpirit, Test45BaseScreen.MenuItem.ROCK, 1, 1, RockSpirit.factory);

  return sc;
};

Test45BaseScreen.prototype.createHitGroups = function() {
  return HitGroups;
};

Test45BaseScreen.prototype.createHitPairs = function() {
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

Test45BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Test45BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Test45BaseScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Test45BaseScreen.prototype.sampleStats = function() {
  for (var i = 0; i < this.rightStatMons.length; i++) {
    this.rightStatMons[i].sample();
  }
  for (var i = 0; i < this.leftStatMons.length; i++) {
    this.leftStatMons[i].sample();
  }
};


Test45BaseScreen.prototype.drawStats = function() {
  this.canvasCuboid.pos.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0);
  this.canvasCuboid.rad.setXYZ(this.canvas.width / 2, this.canvas.height / 2, 0.99);
  for (var i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }
  if (this.drawLeftGraphs) {
    for (var i = 0; i < this.leftStatMons.length; i++) {
      this.leftStatMons[i].draw(this.canvas.width, this.canvas.height);
    }
  }
  if (this.drawRightGraphs) {
    for (var i = 0; i < this.rightStatMons.length; i++) {
      this.rightStatMons[i].draw(this.canvas.width, this.canvas.height);
    }
  }
};

Test45BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Test45BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

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

Test45BaseScreen.prototype.addTractorSeekSplash = function (pos, vel, rad, dist, color) {
  var s = this.splash;
  s.reset(Test45BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

  s.startTime = this.world.now;
  s.duration = 1 + Math.random();

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
  } else {
    rad *= Math.random();
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

Test45BaseScreen.prototype.addTractorRepelSplash = function (pos, angle, vel, rad, dist, color, timeFrac) {
  var s = this.splash;

  var hit = dist > 0;
  s.reset(Test45BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

  s.startTime = this.world.now;

  var x = pos.x;
  var y = pos.y;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.duration = 4 + 6 * timeFrac;

  var r = dist >= 0 ? 1 : 1 + Math.random() * 0.1 + 0.1 * timeFrac;
  s.startPose.pos.setXYZ(x + dx, y + dy, 1);
  s.endPose.pos.setXYZ(x + dx*r, y + dy*r, 0);

  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad * 0.1, rad * 0.1, 1);

  s.startPose.rotZ = -angle;
  s.endPose.rotZ = -angle;

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};