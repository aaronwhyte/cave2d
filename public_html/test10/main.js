var canvas, ctx, viewport, camera;

var pointers = {};

var ANIMATE = true;
var ADJUST_CAMERA = true;
var OBJ_COUNT = 100;
var RECT_CHANCE = 0.2;
var MAX_CLOCKS_PER_ANIMATION = 0.15;
var MAX_TIME_PER_FRAME_MS = 0.95 * 1000 / 60;
var DRAW_GRID_EVENTS = false;
var SPACING = 30;

var testSpirit;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
//  camera.setPanXY(0, 0);
  camera.setZoom(1/100);
//  camera.setRotation(0);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  initGestureListeners();
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

function initGestureListeners() {
  document.body.addEventListener("touchstart", onTouchStart);
  document.body.addEventListener("touchmove", onTouchMove);
  document.body.addEventListener("touchend", onTouchEnd);

  document.body.addEventListener("mousedown", onMouseDown);
  document.body.addEventListener("mouseup", onMouseUp);
  document.body.addEventListener("mouseout", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

//  var havePointerLock = 'pointerLockElement' in document ||
//      'mozPointerLockElement' in document ||
//      'webkitPointerLockElement' in document;
//  if (havePointerLock) {
//  }
}

// maps touch.identifier to Vec2d of the prev touch location
var worldVecs = {};
var MOUSE_IDENTIFIER = "mouse";

function onTouchStart(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchMove(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchEnd(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    delete worldVecs[touch.identifier];
  }
}

var isMouseDown = false;

function onMouseUp() {
  isMouseDown = false;
  delete worldVecs[MOUSE_IDENTIFIER];
}

function onMouseDown(event) {
  isMouseDown = true;
  var point = worldVecFromPageXY(event.pageX, event.pageY);
  worldVecs[MOUSE_IDENTIFIER] = point;
}

function onMouseMove(event) {
  if (isMouseDown) {
    var point = worldVecFromPageXY(event.pageX, event.pageY);
    worldVecs[MOUSE_IDENTIFIER] = point;
  }
}

function worldVecFromPageXY(x, y) {
  var vec = new Vec2d(x, y);
  viewport.canvasToViewport(vec);
  camera.viewportToCamera(vec);
  return vec;
}

///////////////////////////////////////////////

var world, resolver;

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  testSpirit = new TestSpirit();
  var spiritId = world.addSpirit(testSpirit);
  world.addTimeout(0.1, spiritId, null);
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
                (0.2 + Math.random()) * SPACING/2,
                (0.2 + Math.random()) * SPACING/2);
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
      } else {
        v.setXY(Math.random() - 0.5, Math.random() - 0.5);
        b.setVelAtTime(v, 1);
        b.shape = Body.Shape.CIRCLE;
        b.rad = 1 + Math.random() * 4;
        b.mass = Math.PI * b.rad * b.rad;
        b.pathDurationMax = TestSpirit.TIMEOUT;
      }
      b.spiritId = spiritId;
      world.addBody(b);
    }
  }
  b = Body.alloc();
  v.setXY(-sqrt/2 * SPACING - 300, 0);
  b.setPosAtTime(v, 1);
  v.setXY(20, 0);
  b.setVelAtTime(v, 1);

  b.shape = Body.Shape.RECT;
  b.rectRad.setXY(SPACING * 0.6, SPACING * 0.6);
  b.mass = 4 * b.rectRad.x * b.rectRad.y;

//  b.shape = Body.Shape.CIRCLE;
//  b.rad = SPACING * 0.6;
//  b.mass = Math.PI * b.rad * b.rad;
//
  b.pathDurationMax = TestSpirit.TIMEOUT;
  world.addBody(b);

  Vec2d.free(v);
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
  var endTimeMs = Date.now() + MAX_TIME_PER_FRAME_MS;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
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
        ctx.strokeStyle = ctx.fillStyle = 'rgb(0, 200, 200)';
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
    if (b && b.shape == Body.Shape.RECT) {
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
  camera.setZoom(0.9 / z);
  Vec2d.free(v);
}