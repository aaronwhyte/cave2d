/**
 * @constructor
 * @extends {Test42BaseScreen}
 */
function Test42PlayScreen(controller, canvas, renderer, stamps, sfx) {
  Test42BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, 30);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  this.playerSpirits = [];

}
Test42PlayScreen.prototype = new Test42BaseScreen();
Test42PlayScreen.prototype.constructor = Test42PlayScreen;

Test42PlayScreen.ANT_RAD = 1.2;

Test42PlayScreen.MAX_UNDO_DEPTH = 20000;

Test42PlayScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
};

Test42PlayScreen.prototype.getCamera = function() {
  return this.camera;
};

Test42PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  Test42BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.keyTipRevealer);
    window.addEventListener('keydown', this.keyTipRevealer);

  } else {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.keyTipRevealer);
    window.removeEventListener('keydown', this.keyTipRevealer);
  }
  this.listening = listen;
};

Test42PlayScreen.prototype.createDefaultWorld = function() {
  this.world.setChangeRecordingEnabled(true);
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 7;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test42BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }
  var spiritId = this.addItem(Test42BaseScreen.MenuItem.PLAYER, new Vec2d(0, 0), 0);
  var spirit = this.world.spirits[spiritId];
  var controls = new PlayerControls(
      new KeyStick().setUpRightDownLeftByName(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT).startListening(),
      null, null, null);
  spirit.setControls(controls);
  this.playerSpirits.push(spirit);
};

Test42PlayScreen.prototype.handleInput = function () {
  // TOOD players
};

Test42PlayScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  var startTime = performance.now();
  this.drawSpirits();
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
    for (var i = 0; i < this.playerSpirits.length; i++) {
      this.playerSpirits[i].handleInput();
    }
  }
};

Test42PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.renderer.setBlendingEnabled(false);
};

Test42PlayScreen.prototype.isPlaying = function() {
  return true;
};
