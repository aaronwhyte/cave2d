var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var bodyPos = new Vec2d();
var strikeVec = new Vec2d();

var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var stamps = {};

var ZOOM = 10;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;
var lastPathRefreshTime = -Infinity;

var FLOOR_RAD = 7;
var MAX_CIRCLES = 3;

var world, resolver;
var multiPointer;
var sound;

function main() {
  canvas = document.querySelector('#canvas');
  new RendererLoader(canvas, 'vertex-shader.txt', 'fragment-shader.txt').load(onRendererLoaded);
  sound = new SoundFx(SoundFx.getAudioContext());
  sound.setListenerXYZ(0, 0, -0.3);
  multiPointer = new MultiPointer(canvas, viewMatrix);
  multiPointer.startListening();

//  // on-event sound unlocker for iOS
  document.body.addEventListener('mousedown', iosUnlock);
  document.body.addEventListener('touchstart', iosUnlock);
}

var iosUnlocked = false;

function iosUnlock() {
  if (!iosUnlocked) {
    sound.sound(0, 0, 0, 0.1, 0.01, 0.2, 0.01, 300, 300 + 20 * Math.random(), 'sine');
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
  var glyphStamps = new Glyphs(new GlyphMaker(0.6, 2)).initStamps(renderer.gl);
  for (var key in glyphStamps) {
    stamps[key] = glyphStamps[key];
  }
  stamps.sphere = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(vec4.setXYZ(0, 0, 0), 1)
      .createModelStamp(renderer.gl);
  stamps.cube = RigidModel.createCube().createModelStamp(renderer.gl);

  var canModel = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(vec4.setXYZ(0, 0, 0), 3);
  for (var i = 0; i < canModel.vertexes.length; i++) {
    var v = canModel.vertexes[i].position.v;
    if (v[2] > 1) v[2] = 1;
    if (v[2] < -1) v[2] = -1;
    var mag = Vec2d.magnitude(v[0], v[1]);
    if (mag > 1) {
      v[0] = v[0] / mag;
      v[1] = v[1] / mag;
    }
  }
  stamps.can = canModel.createModelStamp(renderer.gl);
}

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  resolver.defaultElasticity = 1;
  var v = new Vec2d();

  var circles = 0;
  var spirit;
  for (var y = -FLOOR_RAD; y <= FLOOR_RAD; y++) {
    for (var x = -FLOOR_RAD ; x <= FLOOR_RAD; x++) {
      var b = Body.alloc();
      v.setXY(x * 2, y * 2);
      b.setPosAtTime(v, 1);
      b.group = 0;
      var rand = Math.random();
      if (Math.abs(y) == FLOOR_RAD || Math.abs(x) == FLOOR_RAD) {
        // Wall
        b.shape = Body.Shape.RECT;
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        b.rectRad.setXY(1, 1);
        spirit = new WallSpirit();
        spirit.bodyId = world.addBody(b);
        world.addSpirit(spirit);
      } else if (Math.random() < 0.07) {
        // Button
        b.shape = Body.Shape.RECT;
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        b.rectRad.setXY(0.5 + Math.random(), 0.5 + Math.random());
        spirit = new ButtonSpirit();
        spirit.bodyId = world.addBody(b);
        spirit.setMultiPointer(multiPointer);
        world.addSpirit(spirit);
      } else if (Math.random() < 0.1 && circles < MAX_CIRCLES) {
        // Ball
        circles++;
        b.shape = Body.Shape.CIRCLE;
        b.rad = 0.3 + (circles / MAX_CIRCLES) * 0.7;
        b.mass = 4/3 * Math.PI * Math.pow(b.rad, 3);
        b.pathDurationMax = PATH_DURATION;
        b.setVelAtTime(new Vec2d(0, 0.5).rot(Math.random() * 2 * Math.PI), world.now);
        world.addBody(b);
      }
    }
  }
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

  // walls & buttons
  // If I was serious, the static wall vertexes would be loaded into GL memory ahead of time.
  for (var id in world.spirits) {
    world.spirits[id].onDraw(world, renderer);
  }

  // draw spheres
  renderer
      .setStamp(stamps.sphere)
      .setColorVector(modelColor.setXYZ(1.6, 1.6, 1.6));
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.shape === Body.Shape.CIRCLE) {
      b.getPosAtTime(world.now, bodyPos);
      drawBody(b);
    }
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
  viewMatrix.multiply(mat4.toRotateZOp(Math.PI * t / 20000));
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

