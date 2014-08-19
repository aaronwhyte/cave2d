var canvas, ctx, viewport, camera;

var grid, squares, vec;

var pointers = {};

SQUARE_PAD = 0.1;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(2000, 2000);
  camera.setZoom(1/100);
  camera.setRotation(0);

  grid = new QuadTreeGrid(100, 8);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  initGestureListeners();
  resizeCanvas();
}

function resizeCanvas() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = w;
  canvas.height = h;
  drawAll();
}

function drawAll() {
  squares = [];
  grid.getSquaresOfColor(1, squares);
  grid.getSquaresOfColor(2, squares);

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawSquares(squares);
}

function initGestureListeners() {
  document.body.addEventListener("touchstart", onTouchStart);
  document.body.addEventListener("touchmove", onTouchMove);
  document.body.addEventListener("touchend", onTouchEnd);

  document.body.addEventListener("mousedown", onMouseDown);
  document.body.addEventListener("mouseup", onMouseUp);
  document.body.addEventListener("mouseout", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

  var havePointerLock = 'pointerLockElement' in document ||
      'mozPointerLockElement' in document ||
      'webkitPointerLockElement' in document;
  if (havePointerLock) {
  }
}

// maps touch.identifier to Vec2d of the prev touch location
var worldVecs = {};
var MOUSE_IDENTIFIER = "mouse";

function onTouchStart(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    paintHall(point);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchMove(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    paintHall(point, worldVecs[touch.identifier]);
    worldVecs[touch.identifier] = point;
  }
}

function onTouchEnd(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    var point = worldVecFromPageXY(touch.pageX, touch.pageY);
    paintHall(point, worldVecs[touch.identifier]);
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
  paintHall(point);
  worldVecs[MOUSE_IDENTIFIER] = point;
}

function onMouseMove(event) {
  if (isMouseDown) {
    var point = worldVecFromPageXY(event.pageX, event.pageY);
    paintHall(point, worldVecs[MOUSE_IDENTIFIER]);
    worldVecs[MOUSE_IDENTIFIER] = point;
  }
}

function worldVecFromPageXY(x, y) {
  var vec = new Vec2d(x, y);
  viewport.canvasToViewport(vec);
  camera.viewportToCamera(vec);
  return vec;
}

function paintHall(p1, opt_p2) {
  var p2 = opt_p2 || p1;
  var segment = new Segment(p1, p2);
  var painter = new HallPillPainter(segment, 4, 3);
  grid.paint(painter);
  drawDirtyRect(painter.getBoundingRect());
}

var FILL_STYLES = ["#000", "#ddd", "#666"];

function drawDirtyRect(rect) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(rect[0] - rect[2], rect[1] - rect[3], rect[2] * 2, rect[3] * 2);
  ctx.restore();

  drawSquares(grid.getSquaresOverlappingRect(rect));
}

function drawSquares(squares) {
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);
  ctx.lineWidth = 0.2;

  for (var color = 1; color < 3; color++) {
    for (var i = 0; i < squares.length; i++) {
      var s = squares[i];
      // color, centerX, centerY, radius
      if (s[0] != color) continue;
      var x = s[1];
      var y = s[2];
      var r = s[3];
      ctx.fillStyle = FILL_STYLES[color];
      ctx.strokeStyle = FILL_STYLES[color];
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.restore();
}
