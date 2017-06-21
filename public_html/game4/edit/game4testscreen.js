/**
 * @constructor
 * @extends {Game4BaseScreen}
 */
function Game4TestScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game4BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.playerAveragePos = new Vec2d();
  this.players = [];

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.testTriggerWidget.setKeyboardTipTimeoutMs(ms);
    for (var i = 0; i < self.players.length; i++) {
      self.players[i].setKeyboardTipTimeoutMs(ms);
    }
  };
}
Game4TestScreen.prototype = new Game4BaseScreen();
Game4TestScreen.prototype.constructor = Game4TestScreen;

Game4TestScreen.prototype.updateHudLayout = function() {
  this.testTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS, 0);
};

Game4TestScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Game4BaseScreen.prototype.setScreenListening.call(this, listen);

  var list = this.listeners.getValues();
  for (var i = 0; i < list.length; i++) {
    if (listen) {
      list[i].startListening();
    } else {
      list[i].stopListening();
    }
  }
  Events.setListening(listen, document.querySelector('#fullScreenButton'), ['click', 'touchEnd'], this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), ['click', 'touchEnd'], this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
  this.listening = listen;
};

Game4TestScreen.prototype.initWidgets = function() {
  var self = this;
  this.testDownFn = function(e) {
    e = e || window.event;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EDIT;
    Url.setFragment(Url.encodeQuery(query));
    e.preventDefault();
  };

  this.testTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.testDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('t')
      .setStamp(this.stamps.untestStamp)
      .setKeyboardTipStamp(this.glyphs.initStamps(this.renderer.gl)['T']);
  this.addListener(this.testTriggerWidget);
};

Game4TestScreen.prototype.startExit = function() {
  // ignore in test screen
};

Game4TestScreen.prototype.drawScene = function() {
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

Game4TestScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.testTriggerWidget.draw(this.renderer);
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].drawHud(this.renderer);
  }
  this.renderer.setBlendingEnabled(false);
};

/////////////////
// Spirit APIs //
/////////////////

Game4TestScreen.prototype.isPlaying = function() {
  return true;
};
