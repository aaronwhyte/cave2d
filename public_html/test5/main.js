var canvas, ctx, viewport, camera;

var rootNode = new BaseNode();

var SHIFTS = 100;
var OFFSET = 0.03;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");
  viewport = new Viewport(canvas);
  camera = new Camera();
  camera.setPanXY(0, 0);
  camera.setZoom(1/35);

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();
  initGestureListeners();

  var shift = new TimeShiftNode();
  shift.addValue(0, 0);
  for (var s = 0; s < SHIFTS; s++) {
    shift.addValue(
            (s / SHIFTS) * (1 - OFFSET * 2) + OFFSET,
            2 * OFFSET * (Math.random() - 0.5));
  }
  shift.addValue(1, 0);
  rootNode.addChild(shift);
  shift.addChild(createClock());
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


function createClock() {
  function createHand(orbitsPerDay, width, length) {
    var rot = new RotateNode();
    rot.addValue(0, 0);
    rot.addValue(1, -orbitsPerDay * Math.PI * 2);
    var left = new Vec2d(-width / 2, -2);
    var right = new Vec2d(width / 2, -2);
    var top = new Vec2d(0, length);
    function createLine(p0, p1) {
      var line = new LineNode();
      line.addValue(0, p0, p1);
      line.addValue(1, p0, p1);
      return line;
    }
    rot.addChild(createLine(left, top));
    rot.addChild(createLine(top, right));
    rot.addChild(createLine(right, left));
    return rot;
  }
  // First, a clock, with a 12 hour period of 0 to 1.
  var clock = new BaseNode();

  // hour hand
  clock.addChild(createHand(2, 4, 17));
  // minute hand
  clock.addChild(createHand(24, 3, 28));
  // second hand
//  clock.addChild(createHand(24 * 60, 0, 27));

  // ticks
  var tickFar = new Vec2d(0, -30);
  var tickNearQuarter = new Vec2d(0, -27);
  var tickNearHour = new Vec2d(0, -28.5);
  var tickNearMinute = new Vec2d(0, -29.5);
  for (var t = 0; t < 60; t++) {
    var tickRot = new RotateNode();
    clock.addChild(tickRot);
    var r = Math.PI * 2 * t / 60;
    tickRot.addValue(0, r);
    tickRot.addValue(1, r);
    tickRot.addValue(1, r);
    var tickLine = new LineNode();
    tickRot.addChild(tickLine);
    if (t % 15 == 0) {
      // quarter tick
      tickLine.addValue(0, tickFar, tickNearQuarter);
      tickLine.addValue(1, tickFar, tickNearQuarter);
    } else if (t % 5 == 0) {
      // hour tick
      tickLine.addValue(0, tickFar, tickNearHour);
      tickLine.addValue(1, tickFar, tickNearHour);
    } else {
      // minute tick
      tickLine.addValue(0, tickFar, tickNearMinute);
      tickLine.addValue(1, tickFar, tickNearMinute);
    }
  }
  return clock;
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
  ctx.lineWidth = 0.3;
  var time = (Date.now() % 30000) / 30000;
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
