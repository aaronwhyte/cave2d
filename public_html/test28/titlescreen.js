/**
 * @constructor
 * @extends {Screen}
 */
function TitleScreen(canvas, renderer, glyphs, stamps, sound) {
  Screen.call(this);
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
  this.labelMaker = new LabelMaker(this.glyphs);
  this.startMatrix = new Matrix44();
  this.nextCharMatrix = new Matrix44().toTranslateOpXYZ(3, 0, 0);

  var sfx = this.sfx;
  this.addButton("PEW!", function(world, x, y) {
    var freq = 2000 + x * 3000;
    var attack = 0.01;
    var sustain = (4 + Math.random() * 2) / 60;
    var decay = (20 + 10 * Math.random()) / 60;
    sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq, 0.5, 'sine');
    sfx.sound(x, y, 0, 0.2, attack, sustain, decay, freq * (2 + Math.random()), 0.5, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
  });

  this.addButton("MEEP", function(world, x, y) {
    var attack = 0.02;
    var sustain = (6 + 3 * Math.random()) / 60;
    var decay = 0.02;
    var freq = 500 + (0.5+x) * 2000;
    sfx.sound(x, y, 0, 0.1, attack, sustain, decay, freq, freq, 'sine');
    freq *= 2.01;
    sfx.sound(x, y, 0, 0.1, attack, sustain, decay, freq, freq, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
  });

  this.addButton("BANG", function(world, x, y) {
    var voices = 3;
    var maxLength = 0;
    var sustain = 0.05 * (Math.random() + 1);
    var baseFreq = (Math.random() + 0.5) * 100;
    for (var i = 0; i < voices; i++) {
      var attack = 0;
      var decay = sustain * 4;
      maxLength = Math.max(maxLength, attack + decay);
      var freq1 = baseFreq * (1 + i/3);
      var freq2 = 1 + i;
      sfx.sound(x, y, 0, 2/voices, attack, sustain, decay, freq1, freq2, 'square');
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
  });

  this.addButton("KABOOM!", function(world, x, y) {
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
  });

  this.addButton("BLOOPIE", function(world, x, y) {
    var voices = 3;
    var noteLen = 0.2 / voices;
    var maxLength = 0;
    var baseFreq = 20 + 10 * (1 + (3 + Math.floor(x * 3)));
    for (var i = 0; i < voices; i++) {
      var delay = i * noteLen;
      var attack = 0;
      var sustain = noteLen * 0.7;
      var decay = noteLen * 0.3;
      maxLength = Math.max(maxLength, delay + attack + decay);
      var freq1 = Math.pow(i+1, 2) * baseFreq;
      var freq2 = freq1 * 2;
      sfx.sound(x, y, 0, 0.2, attack, sustain, decay, freq1, freq2, 'square', delay);
      sfx.sound(x, y, 0, 0.2, attack, sustain, decay, freq1/2, freq2/2, 'sine', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
  });

  this.addButton("TAP", function(world, x, y) {
    var mass = 2 + x * 3;
    var freq = 1000 + (1 + (Math.random() - 0.5)*0.01) * 300 * mass;
    var freq2 = freq + freq * ((Math.random() - 0.5) * 0.05);
    var dur = (1 + mass) * 0.005;
    sfx.sound(x, y, 0, 1, 0, 0, dur, freq, freq2, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = Math.max(100, 1000 * dur);
  });

  this.addButton("BONG", function(world, x, y) {
    var mass = 1.5 - x * 2;
    var dur = 0.7 * mass;
    var freq = 500 / mass;
    sfx.sound(x, y, 0, 0.7, 0.01, 0, dur, freq, freq, 'sine');
    sfx.sound(x, y, 0, 0.7, 0.01, 0, dur, freq/3, freq/3, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = dur * 1000;
  });
};

TitleScreen.prototype.addButton = function(text, func) {
  var model = this.labelMaker.createLabelModel(this.startMatrix, this.nextCharMatrix, text);
  var brect = model.getBoundingRect();
  model.transformPositions(new Matrix44().toTranslateOpXYZ(-brect.pos.x, -brect.pos.y, 0));
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  var pos = new Vec2d(-4.5 * this.nextButtonNum, -4.5 * this.nextButtonNum);
  b.setPosAtTime(pos, this.world.now);
  this.worldBoundingRect.coverVec(pos);
  this.nextButtonNum++;
  b.rectRad.set(brect.rad);
  b.group = 0;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new ButtonSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setMultiPointer(this.multiPointer);
  spirit.setModelStamp(model.createModelStamp(this.renderer.gl));
  spirit.setOnClick(func);
  this.world.addSpirit(spirit);
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
}

TitleScreen.prototype.drawScene = function() {
  this.clock();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
};

TitleScreen.prototype.updateViewMatrix = function(t) {
  // set view matrix
  var edge = this.canvas.height / (Math.sqrt(2)/2);
  this.viewMatrix.toIdentity();

  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              edge / (ZOOM * this.canvas.width),
              0.75 *  edge / (ZOOM * this.canvas.height),
              0.5));

  // Shear
  this.mat4.toIdentity();
  this.mat4.setColRowVal(2, 1, -0.7);
  this.viewMatrix.multiply(this.mat4);

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(15, 15, 0));

  // rotate 45 degrees
  var w = -20;
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(w, w, 0));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(Math.PI /4 + t/1000));
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-w, -w, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
