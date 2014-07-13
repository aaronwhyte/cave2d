var canvas, ctx, viewport, camera;

var quad, squares;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 0);
  camera.setZoom(1/70);
  camera.setRotation(0);

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
  draw();
}

function draw() {
  var d = 30 * Math.sin((Math.PI * 2 * (Date.now() % 100000) / 100000));
  quad = new QuadTree(0, 0, 110, 8);
  quad.colorArea(new CircleArea(-10 - d, -15, 63), 1);
  quad.colorArea(new CircleArea(22 + d, 26 + d, 50), 0);
  squares = quad.getAllSquares();

  ctx.save();
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);
  ctx.lineCap = "round";
  ctx.lineWidth = 0.3;
  var drawn = 0;
  for (var i = 0; i < squares.length; i++) {
    var s = squares[i];
    // color, centerX, centerY, radius
    var color = s[0];
    var x = s[1];
    var y = s[2];
    var r = s[3];
    if (color == 1) {
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
      drawn++;
    }
  }
  ctx.restore();
  requestAnimationFrame(draw, canvas);
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
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, 20, 0, 2*Math.PI, true);
    ctx.fill();
    ctx.stroke();
  }
}
