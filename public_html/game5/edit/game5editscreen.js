/**
 * @constructor
 * @extends {Game5BaseScreen}
 */
function Game5EditScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game5BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.2, 0.6, Game5BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  let self = this;

  this.keyTipRevealer = function() {
    let ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.testTriggerWidget.setKeyboardTipTimeoutMs(ms);
    self.editor.setKeyboardTipTimeoutMs(ms);
  };

  this.shouldDrawStats = true;
}
Game5EditScreen.prototype = new Game5BaseScreen();
Game5EditScreen.prototype.constructor = Game5EditScreen;

Game5EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

Game5EditScreen.ANT_RAD = 0.8;
Game5EditScreen.ROCK_RAD = 1.4;

Game5EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs,
      EditorStamps.create(this.renderer), this.getSpiritConfigs(), new ChangeStack(2000));
  this.editor.gripAccelFraction = 0.25;
};

Game5EditScreen.prototype.initWorld = function() {
  Game5BaseScreen.prototype.initWorld.call(this);
  this.world.setChangeRecordingEnabled(true);
};

Game5EditScreen.prototype.startRecordingChanges = function() {
  this.editor.startRecordingChanges();
};

Game5EditScreen.prototype.updateHudLayout = function() {
  this.testTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game5BaseScreen.WIDGET_RADIUS, Game5BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game5BaseScreen.WIDGET_RADIUS, Game5BaseScreen.WIDGET_RADIUS, 0);
  this.editor.updateHudLayout();
};

Game5EditScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Game5BaseScreen.prototype.setScreenListening.call(this, listen);
  let buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game5EditScreen.prototype.initWidgets = function() {
  let self = this;
  this.testDownFn = function(e) {
    e = e || window.event;
    let query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_TEST;
    Url.setFragment(Url.encodeQuery(query));
    e.preventDefault();
  };

  this.testTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.testDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.8))
      .setPressedColorVec4(new Vec4(1, 1, 1, 0.9))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('t')
      .setStamp(this.stamps.testStamp)
      .setKeyboardTipStamp(this.glyphs.initStamps(this.renderer.gl)['T']);
  this.addListener(this.testTriggerWidget);
};

Game5EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 9.8, 1);
};

Game5EditScreen.prototype.onHitEvent = function(e) {
  let b0 = this.world.getBodyByPathId(e.pathId0);
  let b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game5EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Game5EditScreen.prototype.drawScene = function() {
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.drawSpirits();

  this.renderer.setTexture(Renderer.TEXTURE_WALL);
  this.drawTiles();
  this.renderer.setTexture(Renderer.TEXTURE_NONE);

  this.splasher.drawWithModelIds(this, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game5EditScreen.prototype.drawHud = function() {
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

Game5EditScreen.prototype.configMousePointer = function() {
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

Game5EditScreen.prototype.isPlaying = function() {
  return false;
};

Game5EditScreen.prototype.distOutsideViewCircles = function(pos) {
  return 0;
};