var OBJ_COUNT = 64;
var RECT_CHANCE = 0.7;
var MAX_CLOCKS_PER_ANIMATION = 0.3;
var MAX_TIME_PER_FRAME_MS = 0.95 * 1000 / 60;
var DRAW_GRID_EVENTS = false;
var SPACING = 50;

var ZOOM = 1/100;

var fgCanvas, bgCanvas, winDiv;
var fgCtx, bgCtx, fgViewport, fgCamera, bgCamera;
var world, resolver;
var playerSpirit, raySpirit;

var bgDirty = true;

function main() {
  fgCanvas = document.querySelector('#fgCanvas');
  bgCanvas = document.querySelector('#bgCanvas');
  winDiv = document.querySelector('#winDiv');
  fgCtx = fgCanvas.getContext("2d");
  bgCtx = bgCanvas.getContext("2d");
  fgViewport = new Viewport(fgCanvas);
  fgCamera = new Camera();
  fgCamera.setZoom(ZOOM);
  bgCamera = new Camera();
  bgCamera.setZoom(ZOOM);

  window.addEventListener("resize", function() {
    resize();
  });
  resize();

  initWorld();
  clockAndDraw();
}

function resize() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  winDiv.style.width = fgCanvas.style.width = w + "px";
  winDiv.style.height = fgCanvas.style.height = h + "px";
  fgCanvas.width = w;
  fgCanvas.height = h;

  bgDirty = true;
}

function initWorld() {
  world = new World();
  resolver = new HitResolver();
  var v = Vec2d.alloc();
  var sqrt = Math.sqrt(OBJ_COUNT);
  for (var x = -sqrt/2; x < sqrt/2; x++) {
    for (var y = -sqrt/2; y < sqrt/2; y++) {
      var b = Body.alloc();
      v.setXY(x * SPACING + Math.random(), y * SPACING + Math.random());
      b.setPosAtTime(v, 1);
      if (Math.random() < RECT_CHANCE) {
        b.shape = Body.Shape.RECT;
        b.rectRad.setXY(
                (0.3 + Math.random()) * SPACING * 0.3,
                (0.3 + Math.random()) * SPACING * 0.3);
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        world.addBody(b);
      } else {
        v.setXY(Math.random() - 0.5, Math.random() - 0.5);
        b.setVelAtTime(v, 1);
        b.shape = Body.Shape.CIRCLE;
        b.rad = 2 + Math.random() * 3;
        b.mass = Math.PI * b.rad * b.rad;
        b.pathDurationMax = TestSpirit.TIMEOUT;// * 2;
        var bodyId = world.addBody(b);

        var spirit = new TestSpirit();
        var spiritId = world.addSpirit(spirit);
        spirit.bodyId = bodyId;
        b.spiritId = spiritId;
        world.addTimeout(TestSpirit.TIMEOUT, spiritId, null);
      }
    }
  }

  b = Body.alloc();
  v.setXY(-sqrt/2 * SPACING - 50, 0);
  b.setPosAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 3.5;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = PlayerSpirit.TIMEOUT;
  bodyId = world.addBody(b);

  spirit = new PlayerSpirit();
  spiritId = world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  playerSpirit = spirit;
  b.spiritId = spiritId;
  world.addTimeout(PlayerSpirit.TIMEOUT, spiritId, null);

  var aimStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT)
          .startListening())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('i', 'l', 'k', 'j')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x > fgCanvas.width / 2;
          })
          .setRadius(10)
          .startListening())
      .addStick((new PointerLockStick())
          .setRadius(20)
          .setCanvas(fgCanvas)
          .startListening());

  var moveStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('w', 'd', 's', 'a')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x <= fgCanvas.width / 2;
          })
          .setRadius(20)
          .startListening());

  playerSpirit.setAimStick(aimStick);
  playerSpirit.setMoveStick(moveStick);


  b = Body.alloc();
  v.setXY(sqrt/2 * SPACING + 50, 0);
  b.setPosAtTime(v, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = 7;
  b.mass = Math.PI * b.rad * b.rad;
  b.pathDurationMax = RaySpirit.TIMEOUT;// * 2;
  bodyId = world.addBody(b);
  spirit = new RaySpirit();
  spiritId = world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  raySpirit = spirit;
  b.spiritId = spiritId;
  world.addTimeout(RaySpirit.TIMEOUT, spiritId, null);

  v.free();
}

function clockAndDraw() {
  var endTimeMs = Date.now() + MAX_TIME_PER_FRAME_MS;

  // set fgCamera pan and zoom
  var v = Vec2d.alloc();
  var b = world.bodies[playerSpirit.bodyId];
  b.getPosAtTime(world.now, v);
  fgCamera.setPanXY(v.x, v.y);
  v.free();
  fgCamera.setZoom(ZOOM);

  drawFg(fgCanvas, fgCtx, fgViewport);

  if (bgDirty) {
    bgDirty = false;
    drawBg(bgCanvas, bgCtx);
  }
  var winPxToWorldUnits = getPixelToWorldRatio();
  bgCanvas.style.left = (-bgCanvas.width/2 + window.innerWidth/2 - ((fgCamera.pan.x - bgCamera.pan.x) * winPxToWorldUnits)) + 'px';
  bgCanvas.style.top = (-bgCanvas.height/2 + window.innerHeight/2 + ((fgCamera.pan.y - bgCamera.pan.y) * winPxToWorldUnits)) + 'px';

  clock(endTimeMs);

  requestAnimationFrame(clockAndDraw, fgCanvas);
}

function clock(endTimeMs) {
  var maxClock = world.now + MAX_CLOCKS_PER_ANIMATION;
  var e = world.getNextEvent();
  while (e && e.time <= maxClock && Date.now() <= endTimeMs) {
    world.processNextEvent();
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = world.getBodyByPathId(e.pathId0);
      var b1 = world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        resolver.resolveHit(e.time, e.collisionVec, b0, b1);
        var s0 = world.spirits[b0.spiritId];
        if (s0) s0.onHit(world, b0, b1, e);
        var s1 = world.spirits[b1.spiritId];
        if (s1) s1.onHit(world, b1, b0, e);
      }
    }
    e = world.getNextEvent();
  }
  if (!e || e.time > maxClock) {
    world.now = maxClock;
  }
}

function getPixelToWorldRatio() {
  return Math.min(window.innerWidth, window.innerHeight) / (2 / ZOOM);
}

function drawFg(canvas, ctx, viewport) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  viewport.transform(ctx);
  fgCamera.transformContext(ctx);

  ctx.lineWidth = 0.5;
  ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 0, 0)';
  drawRayHits(ctx);
  ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.mass != Infinity) {
      drawBody(ctx, b, world.now);
    } else if (b) {
//      if (b && b.mass === Infinity) {
//        ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 200, 200)';
//        drawBody(ctx, b, world.now);
//        ctx.strokeStyle = ctx.fillStyle = 'rgb(255, 255, 255)';
//      }
    }
  }
  ctx.restore();
}

function drawBg(canvas, ctx) {
  console.log('drawBg');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // get background brect in world coords.
  var bRect = null;
  var rect = Rect.alloc();
  for (var id in world.bodies) {
    var b = world.bodies[id];
    // Is it a background object?
    if (b && b.mass === Infinity) {
      b.getBoundingRectAtTime(world.now, rect);
      if (bRect == null) {
        bRect = Rect.alloc();
        bRect.set(rect);
      } else {
        bRect.coverRect(rect);
      }
    }
  }
  rect.free();
  if (!bRect) {
    console.warn('no brect for the background');
    return;
  }

  // resize the canvas
  // TODO only do this if the window's minimum dimension, minHalf.
  var winPxToWorldUnits = getPixelToWorldRatio();
  var worldWidthPx = 2 * bRect.rad.x * winPxToWorldUnits;
  var worldHeightPx = 2 * bRect.rad.y * winPxToWorldUnits;
  canvas.style.width = worldWidthPx + 'px';
  canvas.style.height = worldHeightPx + 'px';
  canvas.width = worldWidthPx;
  canvas.height = worldHeightPx;

  ctx.save();

  // transform to viewport coords, in the middle of the canvas
  ctx.translate(canvas.width/2, canvas.height/2);
  var halfWinWidthPx = window.innerWidth / 2;
  var halfWinHeightPx = window.innerHeight / 2;
  var minHalf = Math.min(halfWinWidthPx, halfWinHeightPx);
  ctx.scale(minHalf, -minHalf);

  // pan the the middle of the world's background, and zoom correctly, then transform using camera.
  // TODO parameterize camera
  bgCamera.setPan(bRect.pos);
  bgCamera.setZoom(ZOOM);
  bgCamera.transformContext(ctx);

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  for (var i = 0; i < 700; i++) {
    ctx.strokeStyle = ctx.fillStyle =
        'rgb(' + [randInt(50), randInt(50), randInt(50)].join(',') + ')';
    ctx.beginPath();
    ctx.arc(
        bRect.pos.x + 1.6 * (Math.random() - 0.5) * bRect.rad.x,
        bRect.pos.y + 1.6 * (Math.random() - 0.5) * bRect.rad.y,
        10 * (Math.random() + 2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = ctx.fillStyle = 'rgb(0, 200, 200)';
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.mass === Infinity) {
      drawBody(ctx, b, world.now);
    }
  }
  ctx.restore();

  bRect.free();
}

function drawBody(ctx, b, now) {
  var p = b.getPosAtTime(now, Vec2d.alloc());
  if (b.shape == Body.Shape.CIRCLE) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.rad, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.shape == Body.Shape.RECT) {
    ctx.fillRect(p.x - b.rectRad.x, p.y - b.rectRad.y, b.rectRad.x * 2, b.rectRad.y * 2);
  }
  p.free();
}

function drawRayHits(ctx) {
  var center = world.bodies[raySpirit.bodyId].getPosAtTime(world.now, Vec2d.alloc());
  for (var i = 0; i < raySpirit.hitPos.length; i++) {
    var p = raySpirit.hitPos[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, RaySpirit.RAY_RADUIS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  center.free();
}


