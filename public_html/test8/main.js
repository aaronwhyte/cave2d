var canvas, ctx, viewport, camera;

var pointers = {};

var ANIMATE = false;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
//  camera.setPanXY(0, 0);
//  camera.setZoom(1/22);
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

var world;

function initWorld() {
  world = new World();
  var v = Vec2d.alloc();
  for (var i = 0; i < 30; i++) {
    var b = Body.alloc();
    v.setXY(Math.random() * 20, 0).rot(Math.random() * 2 * Math.PI);
    b.setPosAtTime(v, 0);
    v.setXY(Math.random(), 0).rot(Math.random() * 2 * Math.PI).scaleXY(100, 10);
    b.setVelAtTime(v, 0);
    b.shape = (Math.random() < 0.001) ? Body.Shape.RECT : Body.Shape.CIRCLE;
    b.pathDurationMax = 1.01;
    world.addBody(b);
  }
  // TODO remove
  world.validateBodies();

  Vec2d.free(v);
}

function drawAll() {
  function r() {
    return Math.floor(Math.random() * 256);
  }
  var now = getNow();
  var v = Vec2d.alloc();

  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  adjustCamera(now);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);

  ctx.lineWidth = 0.2;

  for (var id in world.bodies) {
    var b = world.bodies[id];
    b.getPosAtTime(now, v);
    ctx.strokeStyle = 'rgb(' + [r(), r(), r()].join(',') + ')';
//    ctx.strokeStyle = 'rgb(255, 255, 255)';
    if (b.shape == Body.Shape.CIRCLE) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, b.rad, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.shape == Body.Shape.RECT) {
      ctx.strokeRect(v.x - b.rectRad.x, v.y - b.rectRad.y, b.rectRad.x * 2, b.rectRad.y * 2);
    }
  }
  ctx.restore();
  Vec2d.free(v);

  if (ANIMATE) requestAnimationFrame(drawAll, canvas);
}

function getNow() {
  return Math.sin(Date.now() / 333);
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