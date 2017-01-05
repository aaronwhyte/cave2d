/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game2BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.05, 0.17, Game2BaseScreen.CAMERA_VIEW_DIST);

  this.exitStartTime = 0;
  this.exitEndTime = 0;

  this.vec2d = new Vec2d();

  this.lastPathRefreshTime = -Infinity;

  this.hudViewMatrix = new Matrix44();

  this.sounds.setMasterGain(0.5);


  this.playerAveragePos = new Vec2d();
  this.levelColorVector.setRGBA(0.2, 0.3, 0.8, 1);
  this.timeMultiplier = 1;
  this.drawScans = false;
  this.playerChasePolarity = 1;
}
Game2BaseScreen.prototype = new WorldScreen();
Game2BaseScreen.prototype.constructor = Game2BaseScreen;

Game2BaseScreen.WIDGET_RADIUS = 30;
Game2BaseScreen.CAMERA_VIEW_DIST = 25;

Game2BaseScreen.SpiritType = {
  ANT: 3,
  PLAYER: 4,
  EXIT: 5,
  BULLET: 6
};

Game2BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  PLAYER: 'player',
  EXIT: 'exit'
};

Game2BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};

Game2BaseScreen.prototype.createSpiritConfigs = function() {
  var sc = {};
  sc[Game2BaseScreen.SpiritType.ANT] = this.createSpiritConfig(Game2BaseScreen.SpiritType.ANT,
      AntSpirit, Game2BaseScreen.MenuItem.RED_ANT, 0, 0, AntSpirit.factory);
  sc[Game2BaseScreen.SpiritType.PLAYER] = this.createSpiritConfig(Game2BaseScreen.SpiritType.PLAYER,
      PlayerSpirit, Game2BaseScreen.MenuItem.PLAYER, 1, 0, PlayerSpirit.factory);
  sc[Game2BaseScreen.SpiritType.EXIT] = this.createSpiritConfig(Game2BaseScreen.SpiritType.EXIT,
      ExitSpirit, Game2BaseScreen.MenuItem.EXIT, 1, 1, ExitSpirit.factory);
  sc[Game2BaseScreen.SpiritType.BULLET] = this.createSpiritConfig(Game2BaseScreen.SpiritType.BULLET,
      BulletSpirit, null, -1, -1, BulletSpirit.factory);
  return sc;
};

Game2BaseScreen.prototype.createHitGroups = function() {
  return {
    EMPTY: 0,
    WALL: 1,
    NEUTRAL: 2,
    CURSOR: 3,
    PLAYER: 4,
    PLAYER_FIRE: 5,
    ENEMY: 6,
    ENEMY_FIRE: 7,
    ENEMY_SCAN: 8,
    EXPLODEY_BITS: 9
  }
};

Game2BaseScreen.prototype.createHitPairs = function() {
  var g = this.getHitGroups();
  return [
    [g.EMPTY, g.EMPTY],

    [g.NEUTRAL, g.WALL],
    [g.NEUTRAL, g.NEUTRAL],

    [g.CURSOR, g.WALL],
    [g.CURSOR, g.NEUTRAL],

    [g.PLAYER, g.CURSOR],
    [g.PLAYER, g.NEUTRAL],
    [g.PLAYER, g.WALL],
    [g.PLAYER, g.PLAYER],

    [g.PLAYER_FIRE, g.NEUTRAL],
    [g.PLAYER_FIRE, g.WALL],

    [g.ENEMY, g.NEUTRAL],
    [g.ENEMY, g.WALL],
    [g.ENEMY, g.CURSOR],
    [g.ENEMY, g.PLAYER],
    [g.ENEMY, g.PLAYER_FIRE],
    [g.ENEMY, g.ENEMY],

    [g.ENEMY_FIRE, g.WALL],
    [g.ENEMY_FIRE, g.NEUTRAL],
    [g.ENEMY_FIRE, g.PLAYER],

    [g.ENEMY_SCAN, g.WALL],
    [g.ENEMY_SCAN, g.NEUTRAL],
    [g.ENEMY_SCAN, g.PLAYER],
    [g.ENEMY_SCAN, g.ENEMY],

    [g.EXPLODEY_BITS, g.WALL]
  ];
};

Game2BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Game2BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Game2BaseScreen.prototype.initWorld = function() {
  WorldScreen.prototype.initWorld.call(this);
  this.lastPathRefreshTime = -Infinity;
  this.resolver.defaultElasticity = 0.95;
};

Game2BaseScreen.prototype.getCamera = function() {
  return this.camera;
};

Game2BaseScreen.prototype.createTrackball = function() {
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

Game2BaseScreen.prototype.createButtonWidgets = function() {
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  var widgets = [
    new TriggerWidget(this.getHudEventTarget())
        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
        .setStamp(this.stamps.circleStamp)
        .listenToTouch()
        .addTriggerKeyByName('z')
        .setKeyboardTipStamp(glyphStamps['Z']),
    new TriggerWidget(this.getHudEventTarget())
        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
        .setStamp(this.stamps.circleStamp)
        .listenToTouch()
        .addTriggerKeyByName('x')
        .setKeyboardTipStamp(glyphStamps['X']),
    new TriggerWidget(this.getHudEventTarget())
        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25))
        .setPressedColorVec4(new Vec4(1, 1, 1, 0.5))
        .setStamp(this.stamps.playerPauseStamp)
        .addTriggerDownListener(this.pauseDownFn)
        .listenToTouch()
        .listenToMousePointer()
        .addTriggerKeyByName(Key.Name.SPACE)];
  for (var i = 0; i < widgets.length; i++) {
    this.addListener(widgets[i]);
  }
  return widgets;
};

Game2BaseScreen.prototype.onHitEvent = function(e) {
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var playerBody = this.bodyIfSpiritType(Game2BaseScreen.SpiritType.PLAYER, b0, b1);
    if (playerBody) {
      var playerSpirit = this.getSpiritForBody(playerBody);
      var exitBody = this.bodyIfSpiritType(Game2BaseScreen.SpiritType.EXIT, b0, b1);
      if (exitBody && !this.exitStartTime) {
        this.sounds.exit(this.getAveragePlayerPos());
        this.startExit(exitBody.pathStartPos.x, exitBody.pathStartPos.y);
      }
      var antBody = this.bodyIfSpiritType(Game2BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        playerSpirit.hitAnt(mag);
      }
      if (!exitBody && !antBody) {
        this.sounds.wallThump(pos, mag * 10);
      }
    }

    var bulletBody = this.bodyIfSpiritType(Game2BaseScreen.SpiritType.BULLET, b0, b1);
    if (bulletBody) {
      var bulletSpirit = this.getSpiritForBody(bulletBody);
      var otherBody = this.otherBody(bulletBody, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (!otherSpirit) {
        // wall?
        bulletSpirit.onHitWall(mag, pos);
      } else if (otherSpirit.type == Game2BaseScreen.SpiritType.ANT) {
        otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
        bulletSpirit.onHitEnemy(mag, pos);
      } else if (otherSpirit.type == Game2BaseScreen.SpiritType.BULLET) {
        bulletSpirit.onHitOther(mag, pos);
        otherSpirit.onHitOther(mag);
      } else {
        bulletSpirit.onHitOther(mag, pos);
      }
    }
    vec.free();
  }
};

Game2BaseScreen.prototype.handleInput = function() {
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].handleInput();
  }
};

Game2BaseScreen.prototype.addPlayer = function() {
  var p = new Player();
  var trackball = this.createTrackball();
  var buttons = this.createButtonWidgets();
  p.setControls(trackball, buttons[0], buttons[1], buttons[2]);
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == Game2BaseScreen.SpiritType.PLAYER) {
      p.addSpirit(spirit);
    }
  }
  this.players.push(p);
};

Game2BaseScreen.prototype.getWallHitGroup = function() {
  return this.getHitGroups().WALL;
};

Game2BaseScreen.prototype.getCursorHitGroup = function() {
  return this.getHitGroups().CURSOR;
};

Game2BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Game2BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

  s.startTime = this.world.now;
  s.duration = 20;

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

Game2BaseScreen.prototype.getAveragePlayerPos = function() {
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == Game2BaseScreen.SpiritType.PLAYER) {
      var body = spirit.getBody(this.world);
      if (body) {
        if (playerCount == 0) {
          this.playerAveragePos.reset();
        }
        this.playerAveragePos.add(this.getBodyPos(body, this.vec2d));
        playerCount++;
      }
    }
  }
  if (playerCount != 0) {
    this.playerAveragePos.scale(1 / playerCount);
  }
  return this.playerAveragePos;
};
