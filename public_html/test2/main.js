var canvas, ctx, viewport, camera;

var rootNode = new BaseNode();

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 0);
  camera.setZoom(1/200);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();
  initGestureListeners();

  buildNodes();
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

var LINE_COUNT = 6;
var RADIUS = 80;

function buildNodes() {
  var node;

  var hexRoot = new BaseNode();
  for (var i = 0; i < LINE_COUNT; i++) {
    node = new LineNode();
    var frac = i / (LINE_COUNT);
    var p1 = new Vec2d(RADIUS, 0).rot(Math.PI * 2 * frac);
    var p2 = new Vec2d().set(p1).rot(Math.PI * 2 / LINE_COUNT);
    var p3 = new Vec2d().set(p2).rot(Math.PI * 2 / LINE_COUNT);
    node.addValue(0, new Vec2d(), p1);
    node.addValue(0.25, p2, new Vec2d());
    node.addValue(0.5, p1, p2);
    node.addValue(0.75, p2, p3);
    node.addValue(1, p3, new Vec2d());
    hexRoot.addChild(node);
  }

  node = new TranslateNode();
  node.addValue(0, new Vec2d(-100, 0));
  node.addValue(0.25, new Vec2d(0, 100));
  node.addValue(0.5, new Vec2d(100, 0));
  node.addValue(0.75, new Vec2d(0, 100));
  node.addValue(1, new Vec2d(-100, 0));
  node.addChild(hexRoot);
  rootNode.addChild(node);

  node = new TranslateNode();
  node.addValue(0, new Vec2d(100, -100));
  node.addValue(0.5, new Vec2d(-100, -100));
  node.addValue(1, new Vec2d(100, -100));
  node.addChild(hexRoot);
  rootNode.addChild(node);
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
  ctx.lineWidth = 4;
  var time = (Date.now() % 2000) / 2000;
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
