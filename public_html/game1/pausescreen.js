/**
 * @constructor
 * @extends {BaseScreen}
 */
function PauseScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
}
PauseScreen.prototype = new BaseScreen();
PauseScreen.prototype.constructor = PauseScreen;

PauseScreen.prototype.initWorld = function() {
  this.world = new World(World.DEFAULT_CELL_SIZE, 2, [[0, 0], [1, 1]]);
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.9;
  var labelMaker = new LabelMaker(this.glyphs);
  var controller = this.controller;
  var sfx = this.sfx;
  var world = this.world;

  var buttonMaker = new ButtonMaker(labelMaker, this.world, null, this.renderer);
  buttonMaker
      .setNextCharMatrix(new Matrix44().toTranslateOpXYZ(3, 0, 0))
      .setPaddingXY(1.5, 0.5);

  buttonMaker.setLetterColor([1, 0.75, 0.25]).setBlockColor(null);
  buttonMaker.addButton(0, 0, "PAUSED", null);

  // RESUME
  buttonMaker.setLetterColor([2, 1.5, 0.5]).setBlockColor([1, 0.75, 0.25]);
  spiritId = buttonMaker.addButton(0, -8, "RESUME", function(e) {
    var freq0 = 100;
    var freq1 = 5000;
    var delay = 0;
    var attack = 0.01;
    var sustain = 0.1;
    var decay = 0.04;
    sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.gotoScreen(Main30.SCREEN_PLAY);
    controller.requestPointerLock();
  });
  var resumeSpirit = this.world.spirits[spiritId];
  this.setSpaceButtonSpirit(resumeSpirit);
  this.setPointerLockButtonSpirit(resumeSpirit);

  // FULL SCREEN
  buttonMaker.setScale(0.75);
  var spiritId = buttonMaker.addButton(0, -8-6, "FULL SCREEN", function(e) {
    var freq0 = 200;
    var freq1 = 2200;
    var delay = 0;
    var attack = 0.05;
    var sustain = 0.1;
    var decay = 0.2;
    sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.requestFullScreen();
  });
  this.setFullScrnButtonSpirit(world.spirits[spiritId]);

  // QUIT
  var spiritId = buttonMaker.addButton(0, -8-6-5, "QUIT", function(e) {
    var freq0 = 200;
    var freq1 = 5;
    var delay = 0;
    var attack = 0;
    var sustain = 1;
    var decay = 0.1;
    sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.screens[Main30.SCREEN_PLAY].clearBalls();
    controller.gotoScreen(Main30.SCREEN_TITLE);
  });
  this.quitButtonSpirit = world.spirits[spiritId];

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
//  this.worldBoundingRect.coverXY(0, 5);
//  this.worldBoundingRect.coverXY(0, -27);
};

PauseScreen.prototype.updateViewMatrix = function() {
  var br = this.worldBoundingRect;
  this.viewMatrix.toIdentity();
  var ratio = Math.min(this.canvas.height, this.canvas.width) / Math.max(br.rad.x, br.rad.y);
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              ratio / this.canvas.width,
              ratio / this.canvas.height,
          0.2));

  // scale
  var v = this.visibility;
  this.viewMatrix.multiply(this.mat4.toScaleOpXYZ(3 - v*2, v * v, 1));

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -br.pos.x,
      -br.pos.y,
      0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
