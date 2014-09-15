var canvas, ctx, viewport, camera;

var pointers = {};

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 0);
  camera.setZoom(1/22);
  camera.setRotation(0);

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
  for (var i = 0; i < 70; i++) {
    var b = Body.alloc();
    v.setXY(Math.random() * 20 - 10, Math.random() * 20 - 10);
    b.setPosAtTime(v, 0);
    v.setXY(Math.random() * 2 - 1, Math.random() * 2 - 1).scale(20, 20);
    b.setVelAtTime(v, 0);
    b.shape = (Math.random() < 0.5) ? Body.Shape.RECT : Body.Shape.CIRCLE;
    world.addBody(b);
  }
  Vec2d.free(v);
}

function drawAll() {
  function r() {
    return Math.floor(Math.random() * 256);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);

  ctx.lineWidth = 0.2;

  var v = Vec2d.alloc();
  for (var id in world.bodies) {
    var b = world.bodies[id];
    b.getPosAtTime(Math.sin(Date.now() / 500), v);
    ctx.strokeStyle = 'rgb(' + [r(), r(), r()].join(',') + ')';
    if (b.shape == Body.Shape.CIRCLE) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, b.rad, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.shape == Body.Shape.RECT) {
      ctx.strokeRect(v.x - b.radX, v.y - b.radY, b.radX * 2, b.radY * 2);
    }
  }
  ctx.restore();
  Vec2d.free(v);

  requestAnimationFrame(drawAll, canvas);
}
