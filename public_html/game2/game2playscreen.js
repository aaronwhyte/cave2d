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
    self.controller.restartLevel();
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
  if (listen == this.listening) return;
  var fullScreenButton, restartButton, resumeButton, i;
  Game2BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }

    fullScreenButton = document.querySelector('#fullScreenButton');
    fullScreenButton.addEventListener('click', this.fullScreenFn);
    fullScreenButton.addEventListener('touchend', this.fullScreenFn);

    restartButton = document.querySelector('#restartButton');
    restartButton.addEventListener('click', this.restartFn);
    restartButton.addEventListener('touchend', this.restartFn);

    resumeButton = document.querySelector('#resumeButton');
    resumeButton.addEventListener('click', this.pauseDownFn);
    resumeButton.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.keyTipRevealer);
    window.addEventListener('keydown', this.keyTipRevealer);
    window.addEventListener('keydown', this.spacebarFn);

  } else {
    // TODO use ListenerTracker

    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }

    fullScreenButton = document.querySelector('#fullScreenButton');
    fullScreenButton.removeEventListener('click', this.fullScreenFn);
    fullScreenButton.removeEventListener('touchend', this.fullScreenFn);

    restartButton = document.querySelector('#restartButton');
    restartButton.removeEventListener('click', this.pauseDownFn);
    restartButton.removeEventListener('touchend', this.pauseDownFn);

    resumeButton = document.querySelector('#resumeButton');
    resumeButton.removeEventListener('click', this.pauseDownFn);
    resumeButton.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.keyTipRevealer);
    window.removeEventListener('keydown', this.keyTipRevealer);
    window.removeEventListener('keydown', this.spacebarFn);
  }
  this.listening = listen;
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
  this.controller.exitLevel();
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
    this.controller.requestAnimation();
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
