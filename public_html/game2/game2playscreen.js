/**
 * @constructor
 * @extends {Game2BaseScreen}
 */
function Game2PlayScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game2BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.players = [];

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    for (var i = 0; i < self.players.length; i++) {
      self.players[i].setKeyboardTipTimeoutMs(ms);
    }
  };

  this.restartFn = function(e) {
    e = e || window.event;
    self.page.restartLevel();
    e.preventDefault();
  };
}
Game2PlayScreen.prototype = new Game2BaseScreen();
Game2PlayScreen.prototype.constructor = Game2PlayScreen;

Game2PlayScreen.EXIT_DURATION = 3;
Game2PlayScreen.EXIT_WARP_MULTIPLIER = 0.1;

Game2PlayScreen.prototype.updateHudLayout = function() {
};

Game2PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Game2BaseScreen.prototype.setScreenListening.call(this, listen);
  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, document.querySelector('#restartButton'), buttonEvents, this.restartFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game2PlayScreen.prototype.startExit = function(x, y) {
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game2PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game2PlayScreen.EXIT_WARP_MULTIPLIER);

  // giant tube implosion
  var s = this.splash;
  s.reset(Game2BaseScreen.SplashType.WALL_DAMAGE, this.stamps.tubeStamp);

  s.startTime = this.exitStartTime;
  s.duration = Game2PlayScreen.EXIT_DURATION;
  var rad = 80;

  s.startPose.pos.setXYZ(x, y, -0.9999);
  s.endPose.pos.setXYZ(x, y, -0.9999);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad, rad, 1);

  s.startPose2.pos.setXYZ(x, y, -0.9999);
  s.endPose2.pos.setXYZ(x, y, -0.9999);
  s.startPose2.scale.setXYZ(rad/2, rad/2, 1);
  s.endPose2.scale.setXYZ(-rad/6, -rad/6, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(0, 0, 0);
  s.endColor.setXYZ(0, 0, 0);

  this.splasher.addCopy(s);
};

Game2PlayScreen.prototype.exitLevel = function() {
  this.page.exitLevel();
};

Game2PlayScreen.prototype.snapCameraToPlayers = function() {
  var pos = this.getAveragePlayerPos();
  if (pos) {
    this.camera.set(pos);
  }
};

Game2PlayScreen.prototype.drawScene = function() {
  if (!this.players.length) {
    this.addPlayer();
  }
  this.renderer.setViewMatrix(this.viewMatrix);

  var averagePlayerPos = this.getAveragePlayerPos();
  if (averagePlayerPos) {
    this.camera.follow(this.playerAveragePos);
  }

  this.drawSpirits();
  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.page.requestAnimation();
  }
};

Game2PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].drawHud(this.renderer);
  }
  this.renderer.setBlendingEnabled(false);
};

Game2PlayScreen.prototype.isPlaying = function() {
  return true;
};
