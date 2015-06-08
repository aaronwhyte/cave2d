/**
 * @constructor
 * @extends {Screen}
 */
function TitleScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  Screen.call(this);
  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.glyphs = glyphs;
  this.stamps = stamps;
  this.sfx = sound;

  this.viewMatrix = new Matrix44();
  this.mat4 = new Matrix44();
  this.multiPointer = new MultiPointer(this.canvas, this.viewMatrix);
  this.readyToDraw = false;
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
}
TitleScreen.prototype = new Screen();
TitleScreen.prototype.constructor = TitleScreen;

TitleScreen.prototype.setScreenListening = function(listen) {
  if (listen) {
    this.multiPointer.startListening();
  } else {
    this.multiPointer.stopListening();
  }
};

TitleScreen.prototype.drawScreen = function(visibility) {
  this.visibility = visibility;
  if (!this.readyToDraw) {
    this.initWorld();
    this.readyToDraw = true;
  }
  this.clock();
  this.updateViewMatrix(Date.now());
  this.drawScene();
  this.multiPointer.clearEventQueue();
  this.multiPointer.setViewMatrix(this.viewMatrix);
};

TitleScreen.prototype.destroyScreen = function() {
  // Unload button models? Need a nice utility for loading, remembering, and unloading models.
};

TitleScreen.prototype.initWorld = function() {
  this.world = new World();
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 1;
  var labelMaker = new LabelMaker(this.glyphs);

  var controller = this.controller;
  var sfx = this.sfx;

  var buttonMaker = new ButtonMaker(labelMaker, this.world, this.multiPointer, this.renderer);
  buttonMaker
      .setNextCharMatrix(new Matrix44().toTranslateOpXYZ(3, 0, 0))
      .setPaddingXY(1.5, 0.5);

  buttonMaker.setLetterColor([0.25, 0.75, 1]).setBlockColor(null);
  buttonMaker.addButton(0, 0, "TEST 29", null);

  buttonMaker.setLetterColor([0.5, 1.5, 2]).setBlockColor([0.25, 0.75, 1]);
  buttonMaker.addButton(0, -8, "PLAY", function(world, x, y) {
    var freq = 0;
    for (var delay = 0; delay < 0.3; delay += Math.random() * 0.1 + 0.05) {
      freq += 300 + 1000 * Math.random();
      var attack = 0.01;
      var sustain = (4 + Math.random() * 2) / 60;
      var decay = (20 + 10 * Math.random()) / 60;
      sfx.sound(x, y, 0, 0.5, attack, sustain, decay, freq, 1, 'sine', delay);
      sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq * (2 + Math.random()), 1, 'square', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.gotoScreen(Main29.SCREEN_PLAY);
  });

  var spiritId = buttonMaker.addButton(0, -8 -8, "FULLSCREEN", function() {});
  // Look for new overlaps while still in the browser's event handling callstack. Hacky!
  var world = this.world;
  var spirit = world.spirits[spiritId];
  var renderer = this.renderer;
  this.multiPointer.addListener(function(pointerEvent) {
    if (spirit.processPointerEvent(world, renderer, pointerEvent)) {
      controller.requestFullScreen();
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
        sfx.sound(0, 0, 0, 0.2, attack, sustain, decay, freq1, freq2, 'square', delay);
        sfx.sound(0, 0, 0, 0.2, attack, sustain, decay, freq1/2, freq2/2, 'sine', delay);
      }
      spirit.lastSoundMs = Date.now();
      spirit.soundLength = 1000 * maxLength;
    }
  });

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
  this.worldBoundingRect.coverXY(0, -16);
};

TitleScreen.prototype.clock = function() {
  var endTimeMs = Date.now() + MS_PER_FRAME;
  var endClock = this.world.now + CLOCKS_PER_FRAME;

  if (this.lastPathRefreshTime + PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.shape === Body.Shape.CIRCLE) {
        b.invalidatePath();
        b.moveToTime(this.world.now);
      }
    }
  }

  var e = this.world.getNextEvent();
  // Stop if there are no more events to process, or we've moved the game clock far enough ahead
  // to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.

  while (e && e.time <= endClock && Date.now() <= endTimeMs) {
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = this.world.getBodyByPathId(e.pathId0);
      var b1 = this.world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
      }
    }
    this.world.processNextEvent();
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};

TitleScreen.prototype.drawScene = function() {
  this.clock();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
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
  var viz3 = this.visibility;// * this.visibility * this.visibility;
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(br.pos.x, br.pos.y, 0));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 0, 13 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateYOp(Math.PI/2 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(Math.PI/2 * (1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
