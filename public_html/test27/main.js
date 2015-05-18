var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var bodyPos = new Vec2d();

var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var glyphs;
var stamps = {};
var startMatrix = new Matrix44()
    .multiply(mat4.toRotateXOp(0 * -Math.PI / 2));
var nextCharMatrix = new Matrix44()
    .multiply(mat4.toTranslateOpXYZ(3.5, 0, 0));

var ZOOM = 30;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;
var lastPathRefreshTime = -Infinity;

var world, resolver;
var multiPointer;
var sound;

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

  var labelMaker = new LabelMaker(glyphs);

  var v = new Vec2d();
  var b = Body.alloc();
  b.setPosAtTime(v.setXY(0, 0), 1);
  b.group = 0;
  b.shape = Body.Shape.RECT;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  b.rectRad.setXY(1, 1);
  var spirit = new ButtonSpirit();
  spirit.bodyId = world.addBody(b);
  spirit.setMultiPointer(multiPointer);
  var model = labelMaker.createLabelModel(startMatrix, nextCharMatrix, "IT IS ALIVE!");
  spirit.setModelStamp(model.createModelStamp(renderer.gl));
  world.addSpirit(spirit);
}

function loop() {
  clock();
  updateViewMatrix(Date.now());
  drawScene();
  multiPointer.saveOldPos();
  multiPointer.calcInverseViewMatrix(viewMatrix);
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
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = world.getBodyByPathId(e.pathId0);
      var b1 = world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        resolver.resolveHit(e.time, e.collisionVec, b0, b1);

        strikeVec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec);
        var mag = strikeVec.magnitude();

        bonk(b0, b1, mag);
        bonk(b1, b0, mag);
      }
    }
    world.processNextEvent();
    e = world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    world.now = endClock;
  }
}

function bonk(b0, b1, mag) {
  var mass, vol, dur, freq, freq2;
  b0.getPosAtTime(world.now, bodyPos);
  vec4.setXYZ(bodyPos.x, bodyPos.y, 0);
  vec4.transform(viewMatrix);
  if (b0.shape == Body.Shape.RECT) {
    mass = b0.rectRad.x * b0.rectRad.y;
    vol = mag;
    dur = 0.1 * mass;
    freq = 300 / mass;
    freq2 = freq - 2 * Math.random();
    sound.sound(vec4.v[0], vec4.v[1], 0, vol, 0, 0, dur, freq, freq2, 'sine');
  } else {
    mass = b0.mass;
    vol = 2 * mag;
    freq = 1000 + (1 + (Math.random() - 0.5)*0.01) * 300 / mass;
    freq2 = freq + freq * ((Math.random() - 0.5) * 0.05);
    dur = 0.01 + 0.01 * mass;
    sound.sound(vec4.v[0], vec4.v[1], 0, vol, 0, 0, dur, freq, freq2, 'sine');
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
  var edge = Math.min(canvas.width, canvas.height / (Math.sqrt(2)/2));
  viewMatrix.toIdentity();

  viewMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(
          edge / (ZOOM * canvas.width),
          Math.sqrt(2)/2 * edge / (ZOOM * canvas.height),
      0.5)));

  // Shear
  mat4.toIdentity();
  mat4.setColRowVal(2, 1, -1.1);
  viewMatrix.multiply(mat4);

  // Slow spin
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

