var canvas, ctx, viewport, camera;

var ANIMATE = true;
var ADJUST_CAMERA = false;
var OBJ_COUNT = 100;
var RECT_CHANCE = 0.3;
var MAX_CLOCKS_PER_ANIMATION = 0.3;
var MAX_TIME_PER_FRAME_MS = 0.95 * 1000 / 60;
var DRAW_GRID_EVENTS = false;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setZoom(1/80);

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

var world, resolver;

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  var v = Vec2d.alloc();
  for (var i = 0; i < OBJ_COUNT; i++) {
    var b = Body.alloc();
    v.setXY(2 * i + 60 + 2 * Math.random(), 0).rot(0.02 * 2 * Math.PI * i);
    b.setPosAtTime(v, 1);
    v.scale(-1).scaleToLength(2 + 2 * i / OBJ_COUNT);//.rot(Math.random() * 0.1);
    b.setVelAtTime(v, 1);
    if (Math.random() < RECT_CHANCE) {
      b.shape = Body.Shape.RECT;
      b.rectRad.setXY(0.5 + Math.random() * 3, 0.5 + Math.random() * 3);
      b.mass = 4 * b.rectRad.x * b.rectRad.y;
    } else {
      b.shape = Body.Shape.CIRCLE;
      b.rad = 0.5 + Math.random() * 3;
      b.mass = Math.PI * b.rad * b.rad;
    }
    b.pathDurationMax = 10000;
    world.addBody(b);
  }

  // The Big Guys
  b = Body.alloc();
  v.setXY(0, 600);
  b.setPosAtTime(v, 1);
  v.setXY(0, -4);
  b.setVelAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 50;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = 10000;
  world.addBody(b);

  b = Body.alloc();
  v.setXY(0, -600);
  b.setPosAtTime(v, 1);
  v.setXY(0, 3);
  b.setVelAtTime(v, 1);
  b.shape = Body.Shape.RECT;
  b.rectRad.setXY(100, 100);
  b.mass = 4 * b.rectRad.x * b.rectRad.y;
  b.pathDurationMax = 10000;
  world.addBody(b);

  // Supermass
  b = Body.alloc();
  v.setXY(200, 0);
  b.setPosAtTime(v, 1);
  v.setXY(-1, 0);
  b.setVelAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 3;
  b.mass = Infinity;
  b.pathDurationMax = 10000;
  world.addBody(b);

  v.free();
}


function drawBody(b, now) {
  var p = b.getPosAtTime(now, Vec2d.alloc());
  if (b.shape == Body.Shape.CIRCLE) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.rad, 0, Math.PI * 2);
    ctx.fill();
//    ctx.stroke();
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
  function r() {
    return Math.floor(Math.random() * 255);
  }
  var endTimeMs = Date.now() + MAX_TIME_PER_FRAME_MS;
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);

  ctx.lineWidth = 0.4;

  ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b) {
      if (b.mass == Infinity) {
        ctx.strokeStyle = ctx.fillStyle = 'rgb(' + [r(),r(),r()].join(',') + ')';
        drawBody(b, world.now);
        ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
      } else {
        drawBody(b, world.now);
      }
    }
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
        ctx.strokeStyle = 'rgb(0, 0, 255)';
        drawCellRange(e.cellRange);
      }
    }
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
  if (!e || e.time > maxClock) {
    world.now = maxClock;
  }
  if (ADJUST_CAMERA) {
    adjustCamera();
  }
  ctx.restore();
  if (ANIMATE) requestAnimationFrame(clockAndDraw, canvas);
}

function adjustCamera(now) {
  var v = Vec2d.alloc();

  // reset the camera to surround the objects
  var bRect = new Rect();
  var rect = new Rect();
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b) {
      b.getBoundingRectAtTime(world.now, rect);
      bRect.coverRect(rect);
    }
  }
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
  camera.setZoom(1 / z);
  v.free();
}