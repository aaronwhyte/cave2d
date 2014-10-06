var canvas, ctx, viewport, camera;

var pointers = {};

var ANIMATE = true;
var DRAW_GRID_EVENTS = true;
var MAX_TIME = 10;
var OBJ_COUNT = 30;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
//  camera.setPanXY(0, 0);
  camera.setZoom(1/80);
//  camera.setRotation(0);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  initGestureListeners();
  resizeCanvas();

  initWorld();
  drawAll();
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
//    paintHall(point);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchMove(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
//    paintHall(point, worldVecs[touch.identifier]);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchEnd(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
//    paintHall(point, worldVecs[touch.identifier]);
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
//  paintHall(point);
  worldVecs[MOUSE_IDENTIFIER] = point;
}

function onMouseMove(event) {
  if (isMouseDown) {
    var point = worldVecFromPageXY(event.pageX, event.pageY);
//    paintHall(point, worldVecs[MOUSE_IDENTIFIER]);
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

var world, hits, enters, exits;

function initWorld() {
  world = new World();
  var v = Vec2d.alloc();
  for (var i = 0; i < OBJ_COUNT; i++) {
    var b = Body.alloc();

//    if (i > 0) {
//      v.setXY(20, 0).rot(2 * Math.PI * i / OBJ_COUNT);
//      b.setPosAtTime(v, 1);
//      v.scale(-0.5);
//      b.setVelAtTime(v, 1);
//    }

    v.setXY(Math.random() * 50, 0).rot(Math.random() * 2 * Math.PI);
    b.setPosAtTime(v, 1);
    v.setXY(Math.random() * 10 + 1, 0).rot(Math.random() * 2 * Math.PI);
    b.setVelAtTime(v, 1);
    if (Math.random() > 0.5) {
      b.shape = Body.Shape.RECT;
      b.rectRad.setXY(1 + Math.random() * 3, 1 + Math.random() * 3);
    } else {
      b.shape = Body.Shape.CIRCLE;
      b.rad = 1 + Math.random() * 3;
    }
    b.pathDurationMax = 10000;
    world.addBody(b);
  }
  // TODO remove
  world.validateBodies();
  var e;
  hits = [];
  enters = [];
  exits = [];
  while (e = world.getNextEvent()) {
    if (e.time > MAX_TIME) break;
    if (e.type == WorldEvent.TYPE_HIT) {
      hits.push({time:e.time, pathId0: e.pathId0, pathId1: e.pathId1});
    } else if (e.type == WorldEvent.TYPE_GRID_ENTER) {
      var cellRange = new CellRange();
      cellRange.set(e.cellRange);
      enters.push({time: e.time, cellRange:cellRange});
    } else if (e.type == WorldEvent.TYPE_GRID_EXIT) {
      var cellRange = new CellRange();
      cellRange.set(e.cellRange);
      exits.push({time: e.time, cellRange:cellRange});
    }
    world.processNextEvent();
  }

  Vec2d.free(v);
}


function drawBody(b, now) {
  var p = b.getPosAtTime(now, Vec2d.alloc());
  if (b.shape == Body.Shape.CIRCLE) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.rad, 0, Math.PI * 2);
    ctx.stroke();
  } else if (b.shape == Body.Shape.RECT) {
    ctx.strokeRect(p.x - b.rectRad.x, p.y - b.rectRad.y, b.rectRad.x * 2, b.rectRad.y * 2);
  }
  p.free();
}

function drawCell(ix, iy) {
  var x = ix * World.CELL_SIZE;
  var y = iy * World.CELL_SIZE;
  ctx.strokeRect(x - World.CELL_SIZE/2,  y - World.CELL_SIZE/2, World.CELL_SIZE, World.CELL_SIZE);
}

function drawAll() {
//  function r() {
//    return Math.floor(Math.random() * 256);
//  }
  var now = getNow();
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

//  adjustCamera(now);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);

  ctx.lineWidth = 0.2;

  if (DRAW_GRID_EVENTS) {
    ctx.strokeStyle = 'rgb(0, 200, 0)';
    for (var i = 0; i < enters.length; i++) {
      var enter = enters[i];
      var t = enter.time;
      if (t < now && t > now - 0.3) {
        var cr = enter.cellRange;
        for (var iy = cr.p0.y; iy <= cr.p1.y; iy++) {
          for (var ix = cr.p0.x; ix <= cr.p1.x; ix++) {
            drawCell(ix, iy);
          }
        }
      }
    }
    ctx.strokeStyle = 'rgb(0, 0, 200)';
    for (var i = 0; i < exits.length; i++) {
      var exit = exits[i];
      var t = exit.time;
      if (t < now && t > now - 0.3) {
        var cr = exit.cellRange;
        for (var iy = cr.p0.y; iy <= cr.p1.y; iy++) {
          for (var ix = cr.p0.x; ix <= cr.p1.x; ix++) {
            drawCell(ix, iy);
          }
        }
      }
    }
  }

  ctx.strokeStyle = 'rgb(255, 255, 255)';
  for (var id in world.bodies) {
    var b = world.bodies[id];
    drawBody(b, now);
  }

  ctx.strokeStyle = 'rgb(255, 0, 0)';
  for (var i = 0; i < hits.length; i++) {
    var hit = hits[i];
    var t = hit.time;
    if (t < now && t > now - 0.4) {
      var b0 = world.paths[hit.pathId0];
      var b1 = world.paths[hit.pathId1];
      drawBody(b0, now);
      drawBody(b1, now);
    }
  }

  ctx.restore();
  if (ANIMATE) requestAnimationFrame(drawAll, canvas);
}

function getNow() {
  return 1 + ((Date.now() *  MAX_TIME / 5000) % (MAX_TIME - 1));
}

function adjustCamera(now) {
  var v = Vec2d.alloc();

  // reset the camera to surround the objects
  var bRect = new Rect();
  var rect = new Rect();
  for (var id in world.bodies) {
    var b = world.bodies[id];
    b.getPosAtTime(now, v);
    b.getBoundingRectAtTime(now, rect);
    bRect.coverRect(rect);
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
  Vec2d.free(v);
}