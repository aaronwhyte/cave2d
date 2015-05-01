var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var array3 = [0, 0, 0];
var bodyPos = new Vec2d();

var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var screenToClipMatrix = new Matrix44();
var screenToWorldMatrix = new Matrix44();
var modelColor = new Vec4();

var stamps = {};

var ZOOM = 15;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.1;
var PATH_DURATION = 10;
var lastPathRefreshTime = 0;

var FLOOR_RAD = 7;

var world, resolver;

var pointer, pScreenVec4, pWorldVec4;
var POINTER_RAD = 1/3;
var POINTER_HEIGHT = 2.01;

function main() {
  canvas = document.querySelector('#canvas');
  new RendererLoader(canvas, 'vertex-shader.txt', 'fragment-shader.txt').load(onRendererLoaded);
  pScreenVec4 = new Vec4();
  pWorldVec4 = new Vec4();
  pointer = new MonoPointer();
  pointer.startListening();
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
  var v = new Vec2d();

  for (var y = -FLOOR_RAD; y <= FLOOR_RAD; y++) {
    for (var x = -FLOOR_RAD ; x <= FLOOR_RAD; x++) {
      var b = Body.alloc();
      v.setXY(x * 2, y * 2);
      b.setPosAtTime(v, 1);
      b.group = 0;
      var rand = Math.random();
      // Stationary wall
      if (Math.abs(y) == FLOOR_RAD || Math.abs(x) == FLOOR_RAD) {
        b.shape = Body.Shape.RECT;
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        b.rectRad.setXY(1, 1);
        world.addBody(b);
      } else if (Math.random() < 0.1) {
        b.shape = Body.Shape.RECT;
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        b.rectRad.setXY(0.5 + Math.random(), 0.5 + Math.random());
        world.addBody(b);
      } else if (Math.random() < 0.1) {
        b.shape = Body.Shape.CIRCLE;
        b.rad = 1 - Math.random() * 0.5;
        b.mass = 4/3 * Math.PI * Math.pow(b.rad, 3);
        b.setVelXYAtTime(Math.random() - 0.5, Math.random() - 0.5, world.now);
        b.pathDurationMax = PATH_DURATION;
        world.addBody(b);
      }
    }
  }
}

function loop() {
  clock();
  drawScene();
  requestAnimationFrame(loop, canvas);
}

function clock() {
  var endTimeMs = Date.now() + MS_PER_FRAME;
  var endClock = world.now + CLOCKS_PER_FRAME;
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
      }
    }
    world.processNextEvent();
    e = world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    world.now = endClock;
  }

  if (lastPathRefreshTime + PATH_DURATION - CLOCKS_PER_FRAME <= world.now) {
    lastPathRefreshTime = world.now;
    for (var id in world.bodies) {
      var b = world.bodies[id];
      if (b && b.shape === Body.Shape.CIRCLE) {
        b.invalidatePath();
      }
    }
  }
}

function isPointing() {
  return true;
}

function drawScene() {
  renderer.resize().clear();
  var t = Date.now();
  setViewMatrix(t);
  setPointerWorldVec();

  // draw pointer puck
  if (isPointing()) {
    renderer
        .setStamp(stamps.can)
        .setColorVector(modelColor.setXYZ(
                0.5 + 0.25 * Math.sin(t / 60),
                0.5 + 0.25 * Math.sin(2*Math.PI/3 + t / 60),
                0.5 + 0.25 * Math.sin(4*Math.PI/3 + t / 60)));
    modelMatrix.toTranslateOp(pWorldVec4);
    modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(POINTER_RAD, POINTER_RAD, POINTER_HEIGHT*0.5)));
    renderer.setModelMatrix(modelMatrix);
    renderer.drawStamp();
  }

  // walls
  // If I was serious, the static wall vertexes would be loaded into GL memory ahead of time.
  renderer
      .setStamp(stamps.cube)
      .setColorVector(modelColor.setXYZ(0.7, 0.7, 0.7));
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.shape === Body.Shape.RECT) {
      b.getPosAtTime(world.now, bodyPos);
      if (isPointing() &&
          Math.abs(pWorldVec4.v[0] - bodyPos.x) <= b.rectRad.x + POINTER_RAD &&
          Math.abs(pWorldVec4.v[1] - bodyPos.y) <= b.rectRad.y + POINTER_RAD) {
        renderer.setColorVector(modelColor.setXYZ(1, 0, 0));
        drawBody(b);
        renderer.setColorVector(modelColor.setXYZ(0.7, 0.7, 0.7));
      } else {
        drawBody(b);
      }
    }
  }

  // draw spheres
  renderer
      .setStamp(stamps.sphere)
      .setColorVector(modelColor.setXYZ(0, 1, 0));
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.shape === Body.Shape.CIRCLE) {
      b.getPosAtTime(world.now, bodyPos);
      if (isPointing() &&
          Vec2d.magnitude(pWorldVec4.v[0] - bodyPos.x, pWorldVec4.v[1] - bodyPos.y) <= b.rad + POINTER_RAD) {
        renderer.setColorVector(modelColor.setXYZ(1, 0, 0));
        drawBody(b);
        renderer.setColorVector(modelColor.setXYZ(0, 1, 0));
      } else {
        drawBody(b);
      }
    }
  }
}

function setViewMatrix(t) {
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

function setPointerWorldVec() {
  pScreenVec4.setXYZ(pointer.pos.x, pointer.pos.y, 0);

  screenToClipMatrix.toIdentity();
  screenToClipMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(2 / canvas.width, -2 / canvas.height, 0)));
  screenToClipMatrix.multiply(mat4.toTranslateOp(vec4.setXYZ(-canvas.width / 2, -canvas.height / 2, 0)));

  pWorldVec4.set(pScreenVec4).transform(screenToClipMatrix);

  viewMatrix.getInverse(mat4);
  pWorldVec4.transform(mat4);
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

