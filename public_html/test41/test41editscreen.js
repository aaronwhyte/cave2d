/**
 * @constructor
 * @extends {Test41BaseScreen}
 */
function Test41EditScreen(controller, canvas, renderer, stamps, sfx) {
  Test41BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, 30);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.editor.setKeyboardTipTimeoutMs(ms);
  };
}
Test41EditScreen.prototype = new Test41BaseScreen();
Test41EditScreen.prototype.constructor = Test41EditScreen;

Test41EditScreen.ANT_RAD = 1.2;

Test41EditScreen.MAX_UNDO_DEPTH = 20000;

Test41EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs, EditorStamps.create(this.renderer),
      this.getSpiritConfigs(), new ChangeStack(Test41EditScreen.MAX_UNDO_DEPTH));
  this.editor.gripAccelFraction = 0.25;
};

Test41EditScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  this.editor.updateHudLayout();
};

Test41EditScreen.prototype.getCamera = function() {
  return this.camera;
};

Test41EditScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Test41BaseScreen.prototype.setScreenListening.call(this, listen);
  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Test41EditScreen.prototype.createDefaultWorld = function() {
  this.world.setChangeRecordingEnabled(true);
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 24;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test41BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }

  var ants = 12;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test41BaseScreen.MenuItem.ANT, new Vec2d(0, 10).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }
  this.editor.startRecordingChanges();
};

Test41EditScreen.prototype.handleInput = function () {
  this.editor.handleInput();
};

Test41EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  var startTime = performance.now();
  this.drawSpirits();
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Test41EditScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

Test41EditScreen.prototype.configMousePointer = function() {
  if (this.editor.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

Test41EditScreen.prototype.isPlaying = function() {
  return false;
};
