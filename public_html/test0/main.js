var canvas, ctx, viewport, camera;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 100);
  camera.setZoom(1/100);
  //camera.setRotation(Math.PI / 10);

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

var BRANCH_LENGTH = 70;
var BRANCH_RADIUS =  5;
var BRANCH_SCALE = 0.73;
var BRANCH_DEPTH = 19;

function draw() {
  var ctx = canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.save();
  viewport.transform(ctx);
  camera.transformContext(ctx);
  drawTree(BRANCH_DEPTH);
  ctx.restore();
}

function drawTree(depth) {
  function rot() {
    return Math.PI /4 - (Math.random() - 0.5) * Math.PI / 8;
  }
  function newScale() {
    return BRANCH_SCALE * (1 + 0.4 * (Math.random() - 0.5));
  }
  ctx.fillRect(-BRANCH_RADIUS, 0, BRANCH_RADIUS * 2, BRANCH_LENGTH);
  if (depth <=1) return;
  ctx.save();
  ctx.translate(0, BRANCH_LENGTH - BRANCH_RADIUS);
  ctx.rotate(-rot());
  var s = newScale();
  ctx.scale(s, s);
  drawTree(depth - 1);
  ctx.restore();

  ctx.save();
  ctx.translate(0, BRANCH_LENGTH - BRANCH_RADIUS);
  ctx.rotate(+rot());
  var s = newScale();
  ctx.scale(s, s);
  drawTree(depth - 1);
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
