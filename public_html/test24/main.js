var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var array3 = [0, 0, 0];
var bodyPos = new Vec2d();

var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var stamps = {};

var ZOOM = 10;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 1000 / 60;

var world, resolver;

function main() {
  canvas = document.querySelector('#canvas');
  new RendererLoader(canvas, 'vertex-shader.txt', 'fragment-shader.txt').load(onRendererLoaded);
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
}

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  var v = new Vec2d();
  for (var y = -3; y <= 3; y++) {
    for (var x = -3 ; x <= 3; x++) {
      var b = Body.alloc();
      v.setXY(x * 2, y * 2);
      b.setPosAtTime(v, 1);
      b.mass = 1;
      b.pathDurationMax = CLOCKS_PER_FRAME * 1.001;
      var rand = Math.random();
      // Stationary wall
      if (rand < 1/3) {
        b.shape = Body.Shape.RECT;
        b.rectRad.setXY(1, 1);
        world.addBody(b);
      } else if (rand < 2/3) {
        b.shape = Body.Shape.CIRCLE;
        b.rad = 1;
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
        var s0 = world.spirits[b0.spiritId];
        if (s0) s0.onHit(world, b0, b1, e);
        var s1 = world.spirits[b1.spiritId];
        if (s1) s1.onHit(world, b1, b0, e);
      }
    }
    world.processNextEvent();
    e = world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    world.now = endClock;
  }
}

function drawScene() {
  renderer.resize().clear();
  var t = Date.now();

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

  viewMatrix.multiply(mat4.toRotateZOp(Math.PI * t / 8000));

  renderer.setViewMatrix(viewMatrix);

  // walls
  renderer
      .setStamp(stamps.cube)
      .setColorVector(modelColor.setXYZ(0.7, 0.7, 0.7));
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.shape === Body.Shape.RECT) {
      drawBody(b);
    }
  }

  // spheres
  renderer
      .setStamp(stamps.sphere)
      .setColorVector(modelColor.setXYZ(0, 1, 0));
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.shape === Body.Shape.CIRCLE) {
      drawBody(b);
    }
  }

  // floor
  renderer
      .setStamp(stamps.cube)
      .setColorVector(modelColor.setXYZ(0.7, 0.7, 0.7));
  for (var y = -3; y <= 3; y++) {
    for (var x = -3 ; x <= 3; x++) {
      modelMatrix.toTranslateOp(vec4.setXYZ(x * 2, y * 2, 2));
      renderer.setModelMatrix(modelMatrix);
      renderer.drawStamp();
    }
  }

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

