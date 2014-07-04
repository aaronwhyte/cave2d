var canvas, ctx, viewport, camera;

var rootNode = new BaseNode();

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 120);
  camera.setZoom(1/200);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();
  initGestureListeners();

  // The standard hydra has nine heads.
  for (var i = 0; i < 9; i++) {
    buildNodes();
  }
  draw();
}

function resizeCanvas() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = w;
  canvas.height = h;
}

var LINE_COUNT = 30;
var LENGTH = 30;
var BEND = 1.9;

function buildNodes() {
  var p0 = new Vec2d();
  var prevTip = rootNode;
  for (var i = 0; i < LINE_COUNT; i++) {
    var frac = i / LINE_COUNT;
    var p1 = new Vec2d(0, LENGTH / 3);
    var p2 = new Vec2d(0, 2 * LENGTH / 3);
    var p3 = new Vec2d(0, LENGTH);

    var rot = new RotateNode();
    var r0 = BEND * (Math.random() - 0.5);
    var r1 = r0 + frac * BEND * (Math.random() - 0.5);
    rot.addValue(0, r0);
    rot.addValue(Math.random() * 0.8 + 0.1, r1);
    rot.addValue(1, r0);
    prevTip.addChild(rot);

    var line = new LineNode();
    line.addValue(0, p0, p0);
    line.addValue(1/3, p0, p1);
    line.addValue(1, p2, p3);
    rot.addChild(line);
    var line2 = new LineNode();
    line2.addValue(0, p2, p3);
    line2.addValue(1/3, p3, p3);
    rot.addChild(line2);

    var trans = new TranslateNode();
    trans.addValue(0, p3);
    trans.addValue(1, p3);
    rot.addChild(trans);

    var scale = new ScaleNode();
    scale.addValue(0, 0.9);
    scale.addValue(0.5, 0.87);
    scale.addValue(1, 0.9);
    trans.addChild(scale);
    prevTip = scale;
  }
}

function draw() {
  ctx.save();
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  viewport.transform(ctx);
  camera.transform(ctx);
  ctx.strokeStyle = "#000";
  ctx.lineCap = "round";
  ctx.lineWidth = 10;
  var time = (Date.now() % 1000) / 1000;
  rootNode.render(ctx, time);
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
