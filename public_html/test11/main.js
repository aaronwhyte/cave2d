var ANIMATE = true;
var ADJUST_CAMERA = true;
var OBJ_COUNT = 200;
var RECT_CHANCE = 0.5;
var MAX_CLOCKS_PER_ANIMATION = PlayerSpirit.TIMEOUT;
var MAX_TIME_PER_FRAME_MS = 0.95 * 1000 / 60;
var DRAW_GRID_EVENTS = false;
var SPACING = 50;

var canvas, ctx, viewport, camera;
var world, resolver;
var playerSpirit, stick;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setZoom(1/100);

  window.addEventListener("resize", function() {
    resizeCanvas();
  });
  resizeCanvas();

  initWorld();
  clockAndDraw();
}

function resizeCanvas() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = w;
  canvas.height = h;
}

function initWorld() {
  world = new World();
  resolver = new HitResolver();
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

  b = Body.alloc();
  v.setXY(-sqrt/2 * SPACING - 50, 0);
  b.setPosAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 8;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = PlayerSpirit.TIMEOUT;
  bodyId = world.addBody(b);

  spirit = new PlayerSpirit();
  spiritId = world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  playerSpirit = spirit;
  b.spiritId = spiritId;
  world.addTimeout(PlayerSpirit.TIMEOUT, spiritId, null);
  stick = new KeyStick();
  stick.startListening();
  playerSpirit.setStick(stick);

  v.free();
}

function drawBody(b, now) {
  var p = b.getPosAtTime(now, Vec2d.alloc());
  if (b.shape == Body.Shape.CIRCLE) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.rad, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.shape == Body.Shape.RECT) {
    ctx.fillRect(p.x - b.rectRad.x, p.y - b.rectRad.y, b.rectRad.x * 2, b.rectRad.y * 2);
  }
  p.free();
}

function drawCell(ix, iy) {
  var x = ix * World.CELL_SIZE;
  var y = iy * World.CELL_SIZE;
  ctx.strokeRect(x - World.CELL_SIZE/2,  y - World.CELL_SIZE/2, World.CELL_SIZE, World.CELL_SIZE);
}

function drawCellRange(cr) {
  for (var iy = cr.p0.y; iy <= cr.p1.y; iy++) {
    for (var ix = cr.p0.x; ix <= cr.p1.x; ix++) {
      drawCell(ix, iy);
    }
  }
}

function clockAndDraw() {
  var endTimeMs = Date.now() + MAX_TIME_PER_FRAME_MS;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);

  ctx.lineWidth = 0.5;

  ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b) {
      if (b.mass == Infinity) {
        ctx.strokeStyle = ctx.fillStyle = 'rgb(0, 200, 200)';
        drawBody(b, world.now);
        ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
      } else {
        drawBody(b, world.now);
      }
    }
  }

  if (ADJUST_CAMERA) {
    adjustCamera();
  }
  var maxClock = world.now + MAX_CLOCKS_PER_ANIMATION;
  var e = world.getNextEvent();
  while (e && e.time <= maxClock && Date.now() <= endTimeMs) {
    if (DRAW_GRID_EVENTS) {
      if (e.type == WorldEvent.TYPE_GRID_ENTER) {
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        drawCellRange(e.cellRange);
      }
      if (e.type == WorldEvent.TYPE_GRID_EXIT) {
        ctx.strokeStyle = 'rgb(255, 0, 255)';
        drawCellRange(e.cellRange);
      }
    }
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
  if (!e || e.time > maxClock) {
    world.now = maxClock;
  }
  ctx.restore();
  if (ANIMATE) requestAnimationFrame(clockAndDraw, canvas);
}

function adjustCamera() {
  var v = Vec2d.alloc();

  // reset the camera to surround the objects
  var bRect = Rect.alloc();
  var b = world.bodies[playerSpirit.bodyId];
  b.getBoundingRectAtTime(world.now, bRect);
  camera.setPanXY(bRect.pos.x, bRect.pos.y);

  var z;
  if (bRect.rad.x / canvas.width > bRect.rad.y / canvas.height) {
    // hits left and right
    z = bRect.rad.x;
    if (canvas.width > canvas.height) {
      // landscape mode
      z *= canvas.height / canvas.width;
    }
  } else {
    // hits top and bottom
    z = bRect.rad.y;
    if (canvas.width < canvas.height) {
      // portriat mode
      z *= canvas.width / canvas.height;
    }
  }
  z++;
  camera.setZoom(0.05 / z);
  bRect.free();
  v.free();
}