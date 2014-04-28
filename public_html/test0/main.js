var canvas, ctx, viewport, camera;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setZoom(1/100);
  camera.setPanXY(50, 25);
  camera.setRotation(Math.PI / 10);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();

  initGestureListeners();
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
  var ctx = canvas.getContext('2d');
  ctx.save();
  viewport.transform(ctx);
  ctx.strokeStyle="#f00";
  ctx.lineWidth = 0.005;
  ctx.beginPath();
  ctx.rect(0, 0, 1, 1);
  ctx.stroke();
  ctx.save();
  camera.transform(ctx);
  ctx.strokeStyle="#0f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(0, 0, 100, 50);
  ctx.rect(-5, -5, 10, 10);
  ctx.stroke();
  ctx.restore();
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
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, 20, 0, 2*Math.PI, true);
    ctx.fill();
    ctx.stroke();
  }
}
