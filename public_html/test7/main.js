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

  grid = new QuadTreeGrid(150, 8);

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
  draw();
}

function draw() {
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
    var r = s[3] + (color == 1 ? 0.1 : -0.02);
    ctx.fillStyle = color == 1 ? "#ddd" : "#666";
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    drawn++;
  }
  ctx.restore();
}

function initGestureListeners() {
  document.body.addEventListener("touchstart", touchDraw);
  document.body.addEventListener("touchmove", touchDraw);
  document.body.addEventListener("touchend", touchDraw);

  var havePointerLock = 'pointerLockElement' in document ||
      'mozPointerLockElement' in document ||
      'webkitPointerLockElement' in document;
  if (havePointerLock) {
  }
}

function touchDraw(evt) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    vec.setXY(touch.pageX, touch.pageY);
    viewport.canvasToViewport(vec);
    camera.viewportToCamera(vec);
    grid.paint(new HallPainter(vec.x, vec.y, 5, 20), 1);

    ctx.fillStyle = "#f00";
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, 100, 0, 2*Math.PI, true);
    ctx.fill();
    ctx.stroke();
  }
  requestAnimationFrame(draw, canvas);
}
