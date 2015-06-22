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
  var labelMaker = new LabelMaker(this.glyphs);
  var controller = this.controller;
  var sfx = this.sfx;
  var world = this.world;

  var buttonMaker = new ButtonMaker(labelMaker, this.world, this.multiPointer, this.renderer);
  buttonMaker
      .setNextCharMatrix(new Matrix44().toTranslateOpXYZ(3, 0, 0))
      .setPaddingXY(1.5, 0.5);

  buttonMaker.setLetterColor([1, 0.75, 0.25]).setBlockColor(null);
  buttonMaker.addButton(0, 0, "PAUSED", null);

  // RESUME
  buttonMaker.setLetterColor([2, 1.5, 0.5]).setBlockColor([1, 0.75, 0.25]);
  var spiritId = buttonMaker.addButton(0, -8, "RESUME", function(world, x, y) {
    var attack = 0.2;
    var sustain = 0;
    var decay = 0.01;
    sfx.sound(x, y, 0, 0.5, attack, sustain, decay, 100, 2000, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
    controller.gotoScreen(Main30.SCREEN_PLAY);
    controller.requestPointerLock();
  });
  var resumeSpirit = this.world.spirits[spiritId];
  this.setSpaceButtonSpirit(resumeSpirit);
  this.setPointerLockButtonSpirit(resumeSpirit);

  // FULLSCRN
  var spiritId = buttonMaker.addButton(0, -8 -6, "FULLSCRN", function(world, x, y) {
    var voices = 5;
    var noteLen = 0.4 / voices;
    var maxLength = 0;
    var baseFreq = 100;
    for (var i = 0; i < voices; i++) {
      var delay = i * noteLen;
      var attack = 0;
      var sustain = noteLen * 0.7;
      var decay = noteLen * 0.3;
      maxLength = Math.max(maxLength, delay + attack + decay);
      var freq1 = Math.pow(i+1, 2) * baseFreq;
      var freq2 = freq1 * 2;
      sfx.sound(x, y, 0,
          0.2, attack, sustain, decay, freq1, freq2, 'square', delay);
      sfx.sound(x, y, 0,
          0.2, attack, sustain, decay, freq1/2, freq2/2, 'sine', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
    controller.requestFullScreen();
  });
  this.setFullScrnButtonSpirit(world.spirits[spiritId]);

  // QUIT
  buttonMaker.addButton(0, -8 -6 -6, "QUIT", function(world, x, y) {
    var voices = 4;
    var maxLength = 0;
    for (var i = 0; i < voices; i++) {
      var delay = 0.05 * Math.random();
      var attack = 0.05;
      var sustain = 0.1 * (Math.random() + 0.01);
      var decay = (Math.random() + 1) * 0.5;
      maxLength = Math.max(maxLength, delay + attack + decay);
      var freq1 = Math.random() * 300 + 300;
      var freq2 = Math.random() * 10 + 10;
      sfx.sound(x, y, 0, 0.5, attack, sustain, decay, freq1, freq2, 'sine', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
    controller.gotoScreen(Main30.SCREEN_TITLE);
  });

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
  this.worldBoundingRect.coverXY(0, 5);
  this.worldBoundingRect.coverXY(0, -27);
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

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -br.pos.x,
      -br.pos.y,
      0));

  // rotate
  var viz3 = this.visibility;// * this.visibility * this.visibility;
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(br.pos.x, br.pos.y, 0));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 0, 17 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(-Math.PI*0.4 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateYOp(Math.PI*0.3 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(Math.PI*0.5 * (1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
