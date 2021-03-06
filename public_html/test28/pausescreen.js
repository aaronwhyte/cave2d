/**
 * @constructor
 * @extends {Screen}
 */
function PauseScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  Screen.call(this);
  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.glyphs = glyphs;
  this.stamps = stamps;
  this.sfx = sound;

  this.viewMatrix = new Matrix44();
  this.mat4 = new Matrix44();
  this.multiPointer = new MultiPointer(this.canvas, this.viewMatrix, true);
  this.readyToDraw = false;
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
}
PauseScreen.prototype = new Screen();
PauseScreen.prototype.constructor = PauseScreen;

PauseScreen.prototype.setScreenListening = function(listen) {
  if (listen) {
    this.multiPointer.startListening();
  } else {
    this.multiPointer.stopListening();
  }
};

PauseScreen.prototype.drawScreen = function(visibility) {
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

PauseScreen.prototype.destroyScreen = function() {
  // Unload button models? Need a nice utility for loading, remembering, and unloading models.
};

PauseScreen.prototype.initWorld = function() {
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

  buttonMaker.setLetterColor([2, 1.5, 0.5]).setBlockColor(null);
  buttonMaker.addButton(0, 0, "PAUSED", null);

  buttonMaker.setLetterColor([4, 3, 1]).setBlockColor([2, 1.5, 0.5]);
  buttonMaker.addButton(0, -8, "RESUME", function(world, x, y) {
    var attack = 0.2;
    var sustain = 0;
    var decay = 0.01;
    sfx.sound(x, y, 0, 0.5, attack, sustain, decay, 100, 2000, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
    controller.gotoScreen(Main28.SCREEN_PLAY);
  });
  buttonMaker.addButton(0, -14, "QUIT", function(world, x, y) {
    var voices = 8;
    var maxLength = 0;
    for (var i = 0; i < voices; i++) {
      var delay = (i % 2 ? 0 : 0.1) * (1 + 0.1 * Math.random());
      var attack = 0.002;
      var sustain = 0.1 * (Math.random() + 0.01);
      var decay = (Math.random() + 1) * 0.5;
      maxLength = Math.max(maxLength, delay + attack + decay);
      var freq1 = Math.random() * 30 + 30;
      var freq2 = Math.random() * 10 + 10;
      sfx.sound(x, y, 0, 0.8, attack, sustain, decay, freq1, freq2, 'square', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
    controller.gotoScreen(Main28.SCREEN_TITLE);
  });

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
  this.worldBoundingRect.coverXY(0, -16);
};

PauseScreen.prototype.clock = function() {
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
    this.world.processNextEvent();
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = this.world.getBodyByPathId(e.pathId0);
      var b1 = this.world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
      }
    }
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};

PauseScreen.prototype.drawScene = function() {
  this.clock();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
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

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 0, 13 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(-Math.PI/2 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(-Math.PI/2 * (1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
