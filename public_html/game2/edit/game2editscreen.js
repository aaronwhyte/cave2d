/**
 * @constructor
 * @extends {Game2BaseScreen}
 */
function Game2EditScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game2BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.2, 0.6, Game2BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.testTriggerWidget.setKeyboardTipTimeoutMs(ms);
    self.editor.setKeyboardTipTimeoutMs(ms);
  };
}
Game2EditScreen.prototype = new Game2BaseScreen();
Game2EditScreen.prototype.constructor = Game2EditScreen;

Game2EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

Game2EditScreen.ANT_RAD = 0.8;
Game2EditScreen.ROCK_RAD = 1.4;

Game2EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs,
      EditorStamps.create(this.renderer), this.getSpiritConfigs(), new ChangeStack(2000));
  this.editor.gripAccelFraction = 0.25;
};

Game2EditScreen.prototype.initWorld = function() {
  Game2BaseScreen.prototype.initWorld.call(this);
  this.world.setChangeRecordingEnabled(true);
};

Game2EditScreen.prototype.startRecordingChanges = function() {
  this.editor.startRecordingChanges();
};

Game2EditScreen.prototype.updateHudLayout = function() {
  this.testTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game2BaseScreen.WIDGET_RADIUS, Game2BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game2BaseScreen.WIDGET_RADIUS, Game2BaseScreen.WIDGET_RADIUS, 0);
  this.editor.updateHudLayout();
};

Game2EditScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Game2BaseScreen.prototype.setScreenListening.call(this, listen);
  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game2EditScreen.prototype.initWidgets = function() {
  var self = this;
  this.testDownFn = function(e) {
    e = e || window.event;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_TEST;
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
      .setStamp(this.stamps.testStamp)
      .setKeyboardTipStamp(this.glyphs.initStamps(this.renderer.gl)['T']);
  this.addListener(this.testTriggerWidget);
};

Game2EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 9.8, 1);
};

Game2EditScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game2EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Game2EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.page.requestAnimation();
  }
};

Game2EditScreen.prototype.drawHud = function() {
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
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

Game2EditScreen.prototype.configMousePointer = function() {
  if (this.editor.isMouseHovered() || this.testTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

/////////////////
// Spirit APIs //
/////////////////

Game2EditScreen.prototype.isPlaying = function() {
  return false;
};
