/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.05, 1, BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.players = [];

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    for (var i = 0; i < self.players.length; i++) {
      self.players[i].setKeyboardTipTimeoutMs(ms);
    }
  };

  this.restartFn = function() {
    self.controller.restartLevel();
  };


}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.prototype.updateHudLayout = function() {
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fullScreenButton, restartButton, resumeButton, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
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

PlayScreen.prototype.lazyInit = function() {
  if (!this.initialized) {
    this.initPermStamps();
    this.initSpiritConfigs();
    this.updateHudLayout();
    this.initWorld();
    this.initialized = true;
  }
};

PlayScreen.prototype.initPermStamps = function() {
  BaseScreen.prototype.initPermStamps.call(this);
  this.pauseStamp = this.addLevelStampFromModel(this.models.getPauseWithOutline());
};

PlayScreen.prototype.exitLevel = function() {
  this.controller.exitLevel();
};

PlayScreen.prototype.handleInput = function() {
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].handleInput();
  }
};

PlayScreen.prototype.addPlayer = function() {
  var p = new Player();
  var trackball = this.createTrackball();
  var buttons = this.createButtonWidgets();
  p.setControls(trackball, buttons[0], buttons[1], buttons[2]);
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
      p.addSpirit(spirit);
    }
  }
  this.players.push(p);
};

PlayScreen.prototype.snapCameraToPlayers = function() {
  var pos = this.getAveragePlayerPos();
  if (pos) {
    this.camera.set(pos);
  }
};

PlayScreen.prototype.drawScene = function() {
  if (!this.players.length) {
    this.addPlayer();
  }
  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;

  var averagePlayerPos = this.getAveragePlayerPos();
  if (averagePlayerPos) {
    this.camera.follow(this.playerAveragePos);
  }

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();

  if (this.restarting) {
    this.controller.restart();
    this.restarting = false;
  } else {
    // Animate whenever this thing draws.
    if (!this.paused) {
      this.controller.requestAnimation();
    }
  }
};

PlayScreen.prototype.drawHud = function() {
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

/////////////////
// Spirit APIs //
/////////////////

PlayScreen.prototype.isPlaying = function() {
  return true;
};
