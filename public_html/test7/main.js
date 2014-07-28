var canvas, ctx, viewport, camera;

var grid, squares, vec;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(2000, 2000);
  camera.setZoom(1/70);
  //camera.setRotation(1);

  grid = new QuadTreeGrid(100, 8);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  initGestureListeners();
  resizeCanvas();

  vec = new Vec2d();
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

  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);
  ctx.lineCap = "round";
  ctx.lineWidth = 0.2;
  var drawn = 0;
  for (var i = 0; i < squares.length; i++) {
    var s = squares[i];
    // color, centerX, centerY, radius
    var color = s[0];
    var x = s[1];
    var y = s[2];
    var r = s[3] + 0.05;
    ctx.fillStyle = FILL_STYLES[color];
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    drawn++;
  }
  ctx.restore();
}

function initGestureListeners() {
  document.body.addEventListener("touchstart", touchDraw);
  document.body.addEventListener("touchmove", touchDraw);
  document.body.addEventListener("touchend", touchDraw);

  document.body.addEventListener("mousedown", mouseDown);
  document.body.addEventListener("mouseup", mouseUp);
  window.addEventListener("mousemove", mouseMove);

  var havePointerLock = 'pointerLockElement' in document ||
      'mozPointerLockElement' in document ||
      'webkitPointerLockElement' in document;
  if (havePointerLock) {
  }
}

function touchDraw(event) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    pointerDraw(touch.pageX, touch.pageY);
  }
}

var isMouseDown = false;

function mouseUp() {
  isMouseDown = false;
}

function mouseDown(event) {
  isMouseDown = true;
  pointerDraw(event.pageX, event.pageY);
}

function mouseMove(event) {
  if (isMouseDown) {
    pointerDraw(event.pageX, event.pageY);
  }
}

function pointerDraw(x, y) {
  vec.setXY(x, y);
  viewport.canvasToViewport(vec);
  camera.viewportToCamera(vec);
  var painter = new HallPainter(vec.x, vec.y, 4, 3);
  grid.paint(painter, 1);
  drawDirtyRect(painter.getBoundingRect());
}

var FILL_STYLES = ["#000", "#ddd", "#666"];

function drawDirtyRect(rect) {
  var squares = grid.getSquaresOverlappingRect(rect);
  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);
  for (var i = 0; i < squares.length; i++) {
    var s = squares[i];
    // color, centerX, centerY, radius
    var color = s[0];
    var x = s[1];
    var y = s[2];
    var r = s[3] + 0.05;
    ctx.fillStyle = FILL_STYLES[color];
    ctx.strokeStyle = FILL_STYLES[color];
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}
