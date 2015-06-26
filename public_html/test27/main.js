var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var bodyPos = new Vec2d();

var worldBoundingRect = new Rect();
var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var glyphs;
var stamps = {};

var ZOOM = 26;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;
var lastPathRefreshTime = -Infinity;

var world, resolver;
var multiPointer;
var sound;
var labelMaker, startMatrix, nextCharMatrix;
var nextButtonNum = 0;

var iosUnlocked = false;

function main() {
  canvas = document.querySelector('#canvas');
  new RendererLoader(canvas, 'vertex-shader.txt', 'fragment-shader.txt').load(onRendererLoaded);
  sound = new SoundFx(SoundFx.getAudioContext());
  sound.setListenerXYZ(0, 0, -0.3);
  multiPointer = new MultiPointer(canvas, viewMatrix);
  multiPointer.startListening();

  // on-event sound unlocker for iOS
  document.body.addEventListener('mousedown', iosUnlock);
  document.body.addEventListener('touchstart', iosUnlock);
}

function iosUnlock() {
  if (!iosUnlocked) {
    sound.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    iosUnlocked = true;
  }
}

function onRendererLoaded(r) {
  renderer = r;
  initStamps();
  initWorld();
  loop();
}

function initStamps() {
  var glyphMaker = new GlyphMaker(0.4, 2);
  glyphs = new Glyphs(glyphMaker);
  var glyphStamps = glyphs.initStamps(renderer.gl);
  for (var key in glyphStamps) {
    stamps[key] = glyphStamps[key];
  }
}

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  resolver.defaultElasticity = 1;
  labelMaker = new LabelMaker(glyphs);
  startMatrix = new Matrix44();
  nextCharMatrix = new Matrix44().toTranslateOpXYZ(3, 0, 0);

  addButton("PEW!", function(world, x, y) {
    var freq = 2000 + x * 3000;
    var attack = 0.01;
    var sustain = (4 + Math.random() * 2) / 60;
    var decay = (20 + 10 * Math.random()) / 60;
    sound.sound(x, y, 0, 0.3, attack, sustain, decay, freq, 0.5, 'sine');
    sound.sound(x, y, 0, 0.2, attack, sustain, decay, freq * (2 + Math.random()), 0.5, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
  });

  addButton("MEEP", function(world, x, y) {
    var attack = 0.02;
    var sustain = (6 + 3 * Math.random()) / 60;
    var decay = 0.02;
    var freq = 500 + (0.5+x) * 2000;
    sound.sound(x, y, 0, 0.1, attack, sustain, decay, freq, freq, 'sine');
    freq *= 2.01;
    sound.sound(x, y, 0, 0.1, attack, sustain, decay, freq, freq, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
  });

  addButton("BANG", function(world, x, y) {
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
      sound.sound(x, y, 0, 2/voices, attack, sustain, decay, freq1, freq2, 'square');
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
  });

  addButton("KABOOM!", function(world, x, y) {
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
      sound.sound(x, y, 0, 0.8, attack, sustain, decay, freq1, freq2, 'square', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
  });

  addButton("BLOOPIE", function(world, x, y) {
//    var dur = 0.15;
//    sound.sound(x, y, 0, 0.2, dur * 0.1, dur * 0.9, 0, 300, 100, 'square', 0);
//    sound.sound(x, y, 0, 0.2, 0, dur/2, dur/2, 100, 3000, 'square', dur/2);

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
      sound.sound(x, y, 0, 0.2, attack, sustain, decay, freq1, freq2, 'square', delay);
      sound.sound(x, y, 0, 0.2, attack, sustain, decay, freq1/2, freq2/2, 'sine', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = 1000 * maxLength;
  });

  addButton("TAP", function(world, x, y) {
    var mass = 2 + x * 3;
    var freq = 1000 + (1 + (Math.random() - 0.5)*0.01) * 300 * mass;
    var freq2 = freq + freq * ((Math.random() - 0.5) * 0.05);
    var dur = (1 + mass) * 0.005;
    sound.sound(x, y, 0, 1, 0, 0, dur, freq, freq2, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = Math.max(100, 1000 * dur);
  });

  addButton("BONG", function(world, x, y) {
    var mass = 1.5 - x * 2;
    var dur = 0.7 * mass;
    var freq = 500 / mass;
    sound.sound(x, y, 0, 0.7, 0.01, 0, dur, freq, freq, 'sine');
    sound.sound(x, y, 0, 0.7, 0.01, 0, dur, freq/3, freq/3, 'sine');
    this.lastSoundMs = Date.now();
    this.soundLength = dur * 1000;
  });
}

function addButton(text, func) {
  var model = labelMaker.createLabelModel(startMatrix, nextCharMatrix, text);
  var brect = model.getBoundingRect();
  model.transformPositions(new Matrix44().toTranslateOpXYZ(-brect.pos.x, -brect.pos.y, 0));
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  var pos = new Vec2d(-4.5 * nextButtonNum, -4.5 * nextButtonNum);
  b.setPosAtTime(pos, world.now);
  worldBoundingRect.coverVec(pos);
  nextButtonNum++;
  b.rectRad.set(brect.rad);
  b.group = 0;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new ButtonSpirit();
  spirit.bodyId = world.addBody(b);
  spirit.setMultiPointer(multiPointer);
  spirit.setModelStamp(model.createModelStamp(renderer.gl));
  spirit.setOnClick(func);
  world.addSpirit(spirit);
}

function loop() {
  clock();
  updateViewMatrix(Date.now());
  drawScene();
  multiPointer.setViewMatrix(viewMatrix);
  multiPointer.clearEventQueue();
  requestAnimationFrame(loop, canvas);
}

function clock() {
  var endTimeMs = Date.now() + MS_PER_FRAME;
  var endClock = world.now + CLOCKS_PER_FRAME;

  if (lastPathRefreshTime + PATH_DURATION <= endClock) {
    lastPathRefreshTime = world.now;
    for (var id in world.bodies) {
      var b = world.bodies[id];
      if (b && b.shape === Body.Shape.CIRCLE) {
        b.invalidatePath();
        b.moveToTime(world.now);
      }
    }
  }

  var e = world.getNextEvent();
  // Stop if there are no more events to process, or we've moved the game clock far enough ahead
  // to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.

  while (e && e.time <= endClock && Date.now() <= endTimeMs) {
    world.processNextEvent();
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = world.getBodyByPathId(e.pathId0);
      var b1 = world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        resolver.resolveHit(e.time, e.collisionVec, b0, b1);

        strikeVec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec);
        var mag = strikeVec.magnitude();
      }
    }
    e = world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    world.now = endClock;
  }
}

function drawScene() {
  renderer.resize().clear();
  for (var id in world.spirits) {
    world.spirits[id].onDraw(world, renderer);
  }
}

function updateViewMatrix(t) {
  // set view matrix
  var edge = canvas.height / (Math.sqrt(2)/2);
  viewMatrix.toIdentity();

  viewMatrix
      .multiply(mat4.toTranslateOpXYZ(0, 0.73, 0))
      .multiply(mat4.toScaleOpXYZ(
              edge / (ZOOM * canvas.width),
              Math.sqrt(2)/2 * edge / (ZOOM * canvas.height),
              0.5))
  ;

  // Shear
  mat4.toIdentity();
  mat4.setColRowVal(2, 1, -1.1);
  viewMatrix.multiply(mat4);

  // rotate 45 degrees
  viewMatrix.multiply(mat4.toRotateZOp(Math.PI /4));

  renderer.setViewMatrix(viewMatrix);
}

function drawBody(b) {
  b.getPosAtTime(world.now, bodyPos);
  if (b.shape == Body.Shape.RECT) {
    modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
    modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rectRad.x, b.rectRad.y, 1)));
  } else {
    modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
    modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rad, b.rad, b.rad)));
  }
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
}

