/**
 * @constructor
 * @extends {WorldScreen}
 */
function Game4BaseScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  WorldScreen.call(this, controller, canvas, renderer, stamps, sfx);
  if (!controller) return; // generating prototype

  this.adventureName = adventureName;
  this.levelName = levelName;

  this.camera = new Camera(0.05, 0.17, Game4BaseScreen.CAMERA_VIEW_DIST);
  this.viewableWorldRect = new Rect();
  this.pixelsPerMeter = 100;

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

  this.initStatMons();
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
  BULLET: 6
};

Game4BaseScreen.MenuItem = {
  RED_ANT: 'red_ant',
  PLAYER: 'player',
  EXIT: 'exit'
};

Game4BaseScreen.SplashType = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};

Game4BaseScreen.prototype.createSpiritConfigs = function() {
  var st = Game4BaseScreen.SpiritType;
  var mi = Game4BaseScreen.MenuItem;
  var a  = [
      [st.ANT, AntSpirit, mi.RED_ANT, 0, 0],
      [st.PLAYER, PlayerSpirit, mi.PLAYER, 1, 0],
      [st.EXIT, ExitSpirit, mi.EXIT, 1, 1],
      [st.BULLET, BulletSpirit]
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
    [g.ENEMY_SCAN, g.ENEMY]
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
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var playerBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.PLAYER, b0, b1);
    if (playerBody) {
      var playerSpirit = this.getSpiritForBody(playerBody);
      var exitBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.EXIT, b0, b1);
      if (exitBody && !this.exitStartTime) {
        this.sounds.exit(this.getAveragePlayerPos());
        this.startExit(exitBody.pathStartPos.x, exitBody.pathStartPos.y);
      }
      var antBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        // TODO playerSpirit.hitAnt(mag);
      }
      if (!exitBody && !antBody) {
        this.sounds.wallThump(pos, mag * 10);
      }
    }

    var bulletBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.BULLET, b0, b1);
    if (bulletBody) {
      var bulletSpirit = this.getSpiritForBody(bulletBody);
      var otherBody = this.otherBody(bulletBody, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (!otherSpirit) {
        // wall?
        bulletSpirit.onHitWall(mag, pos);
      } else if (otherSpirit.type === Game4BaseScreen.SpiritType.ANT) {
        otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
        bulletSpirit.onHitEnemy(mag, pos);
      } else if (otherSpirit.type === Game4BaseScreen.SpiritType.BULLET) {
        bulletSpirit.onHitOther(mag, pos);
        otherSpirit.onHitOther(mag);
      } else {
        bulletSpirit.onHitOther(mag, pos);
      }
    }
    vec.free();
  }
};

Game4BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Game4BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

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

Game4BaseScreen.prototype.getAveragePlayerPos = function() {
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type === Game4BaseScreen.SpiritType.PLAYER) {
      var body = spirit.getBody(this.world);
      if (body) {
        if (playerCount === 0) {
          this.playerAveragePos.reset();
        }
        this.playerAveragePos.add(this.getBodyPos(body, this.vec2d));
        playerCount++;
      }
    }
  }
  if (playerCount !== 0) {
    this.playerAveragePos.scale(1 / playerCount);
  }
  return this.playerAveragePos;
};

Game4BaseScreen.prototype.addScanSplash = function (pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Game4BaseScreen.SplashType.SCAN, this.stamps.cylinderStamp);

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

Game4BaseScreen.prototype.addTractorSeekSplash = function (pos, vel, rad, dist, color) {
  var s = this.splash;
  s.reset(Game4BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

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

Game4BaseScreen.prototype.addTractorRepelSplash = function (pos, angle, vel, rad, dist, color, timeFrac) {
  var s = this.splash;

  var hit = dist > 0;
  s.reset(Game4BaseScreen.SplashType.SCAN, this.stamps.circleStamp);

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
