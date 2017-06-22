/**
 * @constructor
 * @extends {Test40BaseScreen}
 */
function Test40EditScreen(controller, canvas, renderer, stamps, sfx) {
  Test40BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, Test40BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.editor.setKeyboardTipTimeoutMs(ms);
  };
}
Test40EditScreen.prototype = new Test40BaseScreen();
Test40EditScreen.prototype.constructor = Test40EditScreen;

Test40EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

Test40EditScreen.ANT_RAD = 1.2;

Test40EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer,
      new Glyphs(new GlyphMaker(0.4, 1.2)), EditorStamps.create(this.renderer), this.getSpiritConfigs());
};

Test40EditScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  this.editor.updateHudLayout();
};

Test40EditScreen.prototype.getCamera = function() {
  return this.camera;
};

Test40EditScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;
  Test40BaseScreen.prototype.setScreenListening.call(this, listen);
  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Test40EditScreen.prototype.initWidgets = function() {
};

Test40EditScreen.prototype.toJSON = function() {
  var json = {
    terrain: this.bitGrid.toJSON(),
    now: this.world.now,
    bodies: [],
    spirits: [],
    timeouts: [],
    splashes: [],
    cursorPos: this.editor.cursorPos.toJSON(),
    cameraPos: this.camera.cameraPos.toJSON()
  };
  // bodies
  for (var bodyId in this.world.bodies) {
    var body = this.world.bodies[bodyId];
    if (body.hitGroup != Test40BaseScreen.Group.WALL) {
      // round velocity on save, to stop from saving tons of high-precision teeny tiny velocities
      this.vec2d.set(body.vel).roundToGrid(Test40EditScreen.ROUND_VELOCITY_TO_NEAREST);
      body.setVelAtTime(this.vec2d, this.now());
      json.bodies.push(body.toJSON());
    }
  }
  // spirits
  for (var spiritId in this.world.spirits) {
    var spirit = this.world.spirits[spiritId];
    json.spirits.push(spirit.toJSON());
  }
  // timeouts
  for (var e = this.world.queue.getFirst(); e; e = e.next[0]) {
    if (e.type === WorldEvent.TYPE_TIMEOUT) {
      var spirit = this.world.spirits[e.spiritId];
      if (spirit) {
        json.timeouts.push(e.toJSON());
      }
    }
  }
  // splashes
  var splashes = this.splasher.splashes;
  for (var i = 0; i < splashes.length; i++) {
    json.splashes.push(splashes[i].toJSON());
  }
  return json;
};

Test40EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 64;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test40BaseScreen.MenuItem.ANT, Vec2d.ZERO, 2 * Math.PI * a / ants);
  }
};

Test40EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Test40EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  var startTime = performance.now();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
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

Test40EditScreen.prototype.drawHud = function() {
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

Test40EditScreen.prototype.configMousePointer = function() {
  if (this.editor.isMouseHovered()) {
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

Test40EditScreen.prototype.isPlaying = function() {
  return true;
};
