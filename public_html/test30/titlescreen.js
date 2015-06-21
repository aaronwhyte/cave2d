/**
 * @constructor
 * @extends {BaseScreen}
 */
function TitleScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
}
TitleScreen.prototype = new BaseScreen();
TitleScreen.prototype.constructor = TitleScreen;

TitleScreen.prototype.initWorld = function() {
  var labelMaker = new LabelMaker(this.glyphs);
  var controller = this.controller;
  var sfx = this.sfx;
  var world = this.world;

  var buttonMaker = new ButtonMaker(labelMaker, this.world, this.multiPointer, this.renderer);
  buttonMaker
      .setNextCharMatrix(new Matrix44().toTranslateOpXYZ(3, 0, 0))
      .setPaddingXY(1.5, 0.5);

  // TITLE
  buttonMaker.setLetterColor([0.25, 0.75, 1]).setBlockColor(null).setScale(1.5);
  var spiritId = buttonMaker.addButton(0, 0, "TEST 30", null);
  var titleSpirit = this.world.spirits[spiritId];
  buttonMaker.setScale(1);

  // PLAY
  buttonMaker.setLetterColor([0.5, 1.5, 2]).setBlockColor([0.25, 0.75, 1]);
  spiritId = buttonMaker.addButton(0, -8, "PLAY", function(world, x, y) {
    var freq = 0;
    for (var delay = 0; delay < 0.1; delay += (Math.random() + 1) * 0.05) {
      freq += 200 + 200 * Math.random();
      var decay = 0.04;
      var attack = 0.05 * (Math.random() + 1);
      var sustain = 0.4 - attack;
      sfx.sound(x, y, 0, 0.5, attack, sustain, decay, freq/4, freq, 'sine', delay);
      sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq/4, freq * (2 + Math.random()), 'sine', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.gotoScreen(Main29.SCREEN_PLAY);
    controller.requestPointerLock();
  });
  var playSpirit = this.world.spirits[spiritId];
  this.setSpaceButtonSpirit(playSpirit);
  this.setPointerLockButtonSpirit(playSpirit);

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

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
  this.worldBoundingRect.coverXY(0, 5);
  this.worldBoundingRect.coverXY(0, -27);

  this.initBigBall();
};

TitleScreen.prototype.initBigBall = function() {
  var model = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  for (var i = 0; i < model.vertexes.length; i++) {
    var r = Math.random();
    model.vertexes[i].color.setXYZ(0, 1-r/4, 1-r/4);
    model.vertexes[i].position.scaleToLength(1.1 - r * 0.1);
  }

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  var pos = new Vec2d(0, -29);
  b.setPosAtTime(pos, this.world.now);
  b.rad = 29;
  b.group = 1;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setMultiPointer(this.multiPointer);
  spirit.setModelStamp(model.createModelStamp(this.renderer.gl));
  return this.world.addSpirit(spirit);
};

TitleScreen.prototype.updateViewMatrix = function() {
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
  var viz3 = this.visibility;

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 0, 5*(1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(br.pos.x, 0, 10));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(-Math.PI/8 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(-Math.PI/20 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, 0, -10));

  this.renderer.setViewMatrix(this.viewMatrix);
};
