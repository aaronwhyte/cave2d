/**
 * @constructor
 * @extends {Game4BaseScreen}
 */
function Game4EditScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game4BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.2, 0.6, Game4BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.testTriggerWidget.setKeyboardTipTimeoutMs(ms);
    self.editor.setKeyboardTipTimeoutMs(ms);
  };

  this.shouldDrawStats = true;
}
Game4EditScreen.prototype = new Game4BaseScreen();
Game4EditScreen.prototype.constructor = Game4EditScreen;

Game4EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

Game4EditScreen.ANT_RAD = 0.8;
Game4EditScreen.ROCK_RAD = 1.4;

Game4EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs,
      EditorStamps.create(this.renderer), this.getSpiritConfigs(), new ChangeStack(2000));
  this.editor.gripAccelFraction = 0.25;
};

Game4EditScreen.prototype.initWorld = function() {
  Game4BaseScreen.prototype.initWorld.call(this);
  this.world.setChangeRecordingEnabled(true);
};

Game4EditScreen.prototype.startRecordingChanges = function() {
  this.editor.startRecordingChanges();
};

Game4EditScreen.prototype.updateHudLayout = function() {
  this.testTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS, 0);
  this.editor.updateHudLayout();
};

Game4EditScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Game4BaseScreen.prototype.setScreenListening.call(this, listen);
  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game4EditScreen.prototype.initWidgets = function() {
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

Game4EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 9.8, 1);
};

Game4EditScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game4EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Game4EditScreen.prototype.drawScene = function() {
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.renderer.setTexture(Renderer.TEXTURE_WALL);
  this.drawTiles();
  this.renderer.setTexture(Renderer.TEXTURE_NONE);

  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game4EditScreen.prototype.drawHud = function() {
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

Game4EditScreen.prototype.configMousePointer = function() {
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

Game4EditScreen.prototype.isPlaying = function() {
  return false;
};
