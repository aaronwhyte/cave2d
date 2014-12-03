var canvas, vertexShader, fragmentShader, program, gl;
var bgVertBuff, bgColorBuff, bgTriangleCount;

var OBJ_COUNT = 64;
var RECT_CHANCE = 0.7;
var CLOCKS_PER_SECOND = 60 * 0.3;
var SPACING = 50;

var prevFrameStartMs;
var frameStartMs;

var ZOOM = 1/200;

var world, resolver;
var playerSpirit, raySpirit;

function main() {
  canvas = document.querySelector('#canvas');

  gl = getWebGlContext(canvas, {
    alpha: false,
    antialias: true
  });

  loadText('vertex-shader.glsl', function(text) {
    vertexShader = compileShader(gl, text, gl.VERTEX_SHADER);
    maybeCreateProgram();
  });

  loadText('fragment-shader.glsl', function(text) {
    fragmentShader = compileShader(gl, text, gl.FRAGMENT_SHADER);
    maybeCreateProgram();
  });
}

function loadText(path, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.responseType = 'text';
  xhr.onload = function() {
    callback(this.response);
  };
  xhr.send();
}

function maybeCreateProgram() {
  if (!vertexShader || !fragmentShader) return;

  program = createProgram(gl, vertexShader, fragmentShader);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);

  onProgramCreated();
}

function onProgramCreated() {
  initWorld();
  loop();
}


function addRect(verts, colors, px, py, pz, rx, ry, r, g, b) {
  // Two triangles form a square.
  verts.push(
      px-rx, py-ry, pz,
      px-rx, py+ry, pz,
      px+rx, py+ry, pz,

      px+rx, py+ry, pz,
      px+rx, py-ry, pz,
      px-rx, py-ry, pz);
  for (var i = 0; i < 6; i++) {
    colors.push(r, g, b, 1);
  }
}

function loop() {
  maybeResize(canvas, gl);
  if (!prevFrameStartMs) {
    prevFrameStartMs = Date.now() - 16;
  } else {
    prevFrameStartMs = frameStartMs;
  }
  frameStartMs = Date.now();
  drawScene(gl, program);
  clock();
  requestAnimationFrame(loop, canvas);
}

function maybeResize(canvas, gl) {
  if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function clock() {
  var frameLength = frameStartMs - prevFrameStartMs;
  if (frameLength > 1000/30) {
    // Don't go below 30fps
    frameLength = 1000/30;
  }
  var endTimeMs = frameStartMs + frameLength;
  var secondsElapsed = frameLength / 1000;
  var endClock = world.now + (1.01 + Math.sin(Date.now() / 1000)) * CLOCKS_PER_SECOND * secondsElapsed;
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

function drawScene(gl, program) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var uTranslation = gl.getUniformLocation(program, "uTranslation");
  var t = Date.now() / 1000;
//  var translation = [0, 0, 0];
  var translation = [Math.sin(t), -Math.cos(t), 0];
  gl.uniform3fv(uTranslation, translation);

  var edgeLength = Math.min(canvas.width, canvas.height);
  var scale = [ZOOM * edgeLength / canvas.width, ZOOM * edgeLength / canvas.height, 1];

  // background
  var uScale = gl.getUniformLocation(program, 'uScale');
  gl.uniform3fv(uScale, scale);
  drawTriangles(gl, program, bgColorBuff, bgVertBuff, bgTriangleCount);

  // foreground
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.mass != Infinity) {
      drawBody(b, world.now, scale);
    }
  }
}

function drawBody(b, now, scale) {
  var p = b.getPosAtTime(now, Vec2d.alloc());

  var verts = [];
  var colors = [];
  if (b.id == playerSpirit.bodyId) {
    addRect(verts, colors, p.x, p.y, 0, b.rad, b.rad, 1, 0.5, 0.5);
  } else if (b.id == raySpirit.bodyId) {
    addRect(verts, colors, p.x, p.y, 0, b.rad, b.rad, 0, 1, 0);
  } else {
    addRect(verts, colors, p.x, p.y, 0, b.rad, b.rad, 0.5, 1, 0.5);
  }

  var fgVertBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fgVertBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STREAM_DRAW);

  var fgColorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fgColorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STREAM_DRAW);

  var uScale = gl.getUniformLocation(program, 'uScale');
  gl.uniform3fv(uScale, scale);
  drawTriangles(gl, program, fgColorBuff, fgVertBuff, 2);

  p.free();
}


function drawTriangles(gl, program, colorBuff, vertBuff, triangleCount) {
  var aVertexColor = gl.getAttribLocation(program, "aVertexColor");
  gl.enableVertexAttribArray(aVertexColor);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
  gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);

  var aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
  gl.enableVertexAttribArray(aVertexPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuff);
  gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, triangleCount * 3);
}


function initWorld() {
  var bgVerts = [];
  var bgColors = [];
  bgTriangleCount = 0;

  world = new World();
  resolver = new HitResolver();
  var red, green, blue;
  var v = Vec2d.alloc();
  var sqrt = Math.sqrt(OBJ_COUNT);
  for (var x = -sqrt/2; x < sqrt/2; x++) {
    for (var y = -sqrt/2; y < sqrt/2; y++) {
      var b = Body.alloc();
      v.setXY(x * SPACING + Math.random(), y * SPACING + Math.random());
      b.setPosAtTime(v, 1);
      if (Math.random() < RECT_CHANCE) {
        b.shape = Body.Shape.RECT;
        b.rectRad.setXY(
                (0.3 + Math.random()) * SPACING * 0.3,
                (0.3 + Math.random()) * SPACING * 0.3);
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        world.addBody(b);
        red = Math.random() / 3;
        green = Math.random() / 3;
        blue = 1 - Math.random() / 3;
        addRect(bgVerts, bgColors, v.x, v.y, 0, b.rectRad.x, b.rectRad.y, red, green, blue);
        bgTriangleCount += 2;

      } else {
        v.setXY(Math.random() - 0.5, Math.random() - 0.5);
        b.setVelAtTime(v, 1);
        b.shape = Body.Shape.CIRCLE;
        b.rad = 2 + Math.random() * 3;
        b.mass = Math.PI * b.rad * b.rad;
        b.pathDurationMax = TestSpirit.TIMEOUT;// * 2;
        var bodyId = world.addBody(b);

        var spirit = new TestSpirit();
        var spiritId = world.addSpirit(spirit);
        spirit.bodyId = bodyId;
        b.spiritId = spiritId;
        world.addTimeout(TestSpirit.TIMEOUT, spiritId, null);
      }
    }
  }

  bgVertBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgVertBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgVerts), gl.STATIC_DRAW);

  bgColorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgColorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bgColors), gl.STATIC_DRAW);

  b = Body.alloc();
  v.setXY(-sqrt/2 * SPACING - 50, 0);
  b.setPosAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 3.5;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = PlayerSpirit.TIMEOUT;
  bodyId = world.addBody(b);

  spirit = new PlayerSpirit();
  spiritId = world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  playerSpirit = spirit;
  b.spiritId = spiritId;
  world.addTimeout(PlayerSpirit.TIMEOUT, spiritId, null);

  var aimStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT)
          .startListening())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('i', 'l', 'k', 'j')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x > canvas.width / 2;
          })
          .setRadius(10)
          .startListening())
      .addStick((new PointerLockStick())
          .setRadius(20)
          .setCanvas(canvas)
          .startListening());

  var moveStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('w', 'd', 's', 'a')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x <= canvas.width / 2;
          })
          .setRadius(20)
          .startListening());

  playerSpirit.setAimStick(aimStick);
  playerSpirit.setMoveStick(moveStick);


  b = Body.alloc();
  v.setXY(sqrt/2 * SPACING + 50, 0);
  b.setPosAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 7;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = RaySpirit.TIMEOUT;// * 2;
  bodyId = world.addBody(b);
  spirit = new RaySpirit();
  spiritId = world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  raySpirit = spirit;
  b.spiritId = spiritId;
  world.addTimeout(RaySpirit.TIMEOUT, spiritId, null);

  v.free();
}
