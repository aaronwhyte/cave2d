/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
  this.trackball = new MultiTrackball()
      .addTrackball(new MouseTrackball())
      .addTrackball(new TouchTrackball());
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();

  // for sound throttling
  this.hitsThisFrame = 0;

  this.visibility = 0;
  this.permStamps = null;
  this.world = null;
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.prototype.onPointerDown = function(pageX, pageY) {
  if (Vec2d.distance(pageX, pageY, this.canvas.width/2, 0) < Math.min(this.canvas.height, this.canvas.width)/4) {
    this.pauseGame();
  } else {
    this.controller.requestPointerLock();
  }
};

PlayScreen.prototype.onSpaceDown = function() {
  this.pauseGame();
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    this.trackball.startListening();
  } else {
    this.trackball.stopListening();
  }
  this.listening = listen;
};

PlayScreen.prototype.pauseGame = function() {
  var freq0 = 3000;
  var freq1 = 30;
  var delay = 0;
  var attack = 0.05;
  var sustain = 0.15;
  var decay = 0.01;
  this.sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
  this.controller.exitPointerLock();
  this.controller.gotoScreen(Game1.SCREEN_PAUSE);
};

PlayScreen.prototype.lazyInit = function() {
  if (!this.permStamps) {
    this.initPermStamps();
  }
  if (!this.world) {
    this.initWorld();
  }
};

PlayScreen.prototype.initPermStamps = function() {
  this.permStamps = [];

  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.permStamps.push(this.cubeStamp);

  var sphereModel = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  this.sphereStamp = sphereModel.createModelStamp(this.renderer.gl);
  this.permStamps.push(this.sphereStamp);
};

PlayScreen.prototype.initWorld = function() {
  this.lastPathRefreshTime = -Infinity;
  this.world = new World(World.DEFAULT_CELL_SIZE, 2, [[0, 0], [1, 1]]);
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.8;
  this.initBalls();
  this.initWalls();
  for (var bodyId in this.world.bodies) {
    var b = this.world.bodies[bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
};

PlayScreen.prototype.initBalls = function() {
  this.ballSpiritId = this.initBall(0, 30, 7, 1,
      2, 0.2, 1.5,
      this.sphereStamp);
  var r = 30;
  this.initBall(
          0, -30,
          r, 1,
          2, 1.5, 0.5,
          this.sphereStamp);
  var maxBalls = 45;
  for (var i = 0; i < maxBalls; i++) {
    r = 6 * i/maxBalls + 2;
    this.initBall(
            Math.sin(Math.PI * 2 * i/maxBalls) * (120-r),
            Math.cos(Math.PI * 2 * i/maxBalls) * (120-r),
            r, 1,
            0.5, 1.5, 0.5,
            this.sphereStamp);
  }
};

PlayScreen.prototype.initBall = function(x, y, rad, density, red, green, blue, stamp) {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosXYAtTime(x, y, this.world.now);
  b.rad = rad;
  b.hitGroup = 0;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PATH_DURATION * 3;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(stamp);
  var spiritId = this.world.addSpirit(spirit);
  this.world.spirits[spiritId].setColorRGB(red, green, blue);
  return spiritId;
};

PlayScreen.prototype.initWalls = function() {
  var grid = new QuadTreeGrid(46.375412352, 6);
  function paintHall(p1, opt_p2) {
    var p2 = opt_p2 || p1;
    var segment = new Segment(p1, p2);
    var painter = new MazePainter(segment, 100, 20);
    grid.paint(painter);
  }
  var rad = 100;
  paintHall(new Vec2d(-rad, -rad), new Vec2d(0, 0.7 * rad));
  paintHall(new Vec2d(0, 0.7 * rad), new Vec2d(rad, -rad));
  paintHall(new Vec2d(-rad, -rad), new Vec2d(rad, -rad));
  paintHall(new Vec2d(rad * 2.14, rad * 0.8));
  paintHall(new Vec2d(-rad * 2.14, rad * 0.8));

  this.levelModel = new RigidModel();
  var a = grid.getSquaresOfColor(MazePainter.SOLID);
  for (var i = 0; i < a.length; i++) {
    var h = a[i];
    //[color, centerX, centerY, radius]
    this.initWall(h[0], h[1], h[2], h[3], h[3]);
  }
  var a = grid.getSquaresOfColor(MazePainter.FAKE);
  for (var i = 0; i < a.length; i++) {
    var h = a[i];
    //[color, centerX, centerY, radius]
    this.initWall(h[0], h[1], h[2], h[3], h[3]);
  }
  this.levelStamp = this.levelModel.createModelStamp(this.renderer.gl);
  this.permStamps.push(this.levelStamp);
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);
};

PlayScreen.prototype.initWall = function(type, x, y, rx, ry) {
  if (type == MazePainter.SOLID) {
    // Create a physics body
    var b = Body.alloc();
    b.shape = Body.Shape.RECT;
    b.setPosXYAtTime(x, y, this.world.now);
    b.rectRad.setXY(rx, ry);
    b.hitGroup = 0;
    b.mass = Infinity;
    b.pathDurationMax = Infinity;
    this.world.addBody(b);
  }
  // draw a square for both SOLID and FAKE walls
  var t = new Matrix44().toTranslateOpXYZ(x, y, 0).multiply(new Matrix44().toScaleOpXYZ(rx, ry, 1));
  var wallModel = RigidModel.createSquare().transformPositions(t);
  wallModel.setColorRGB(0.3, 0.7, 0.9);
  this.levelModel.addRigidModel(wallModel);
};

PlayScreen.prototype.handleInput = function() {
  if (!this.world) return;
  var spirit = this.world.spirits[this.ballSpiritId];
  var body = this.world.bodies[spirit.bodyId];
  var newVel = Vec2d.alloc();
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    var sensitivity = 4;
    this.movement.scale(sensitivity);
    newVel.setXY(this.movement.x, -this.movement.y);

    var accel = Vec2d.alloc().set(newVel).subtract(body.vel);
    var maxAccel = 10;
    // If it's over 1, then use a square root to lower it.
    // (If it's less than 1, then sqrt will make it bigger, so don't bother.)
    var mag = accel.magnitude();
    if (mag > 1) {
      accel.scaleToLength(Math.sqrt(mag));
    }
    accel.clipToMaxLength(maxAccel);
    newVel.set(body.vel).add(accel);
    body.setVelAtTime(newVel, this.world.now);
    accel.free();
  }
  newVel.free();
  this.trackball.reset();
};

PlayScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var strikeVec = Vec2d.alloc().set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec);
    var mag = strikeVec.magnitude();
    this.hitsThisFrame++;
    if (this.hitsThisFrame < 4) {
      this.bonk(b0, mag);
      this.bonk(b1, mag);
    }
    strikeVec.free();
  }
};

PlayScreen.prototype.bonk = function(body, mag) {
  var mass, vol, dur, freq, freq2;
  var bodyPos = Vec2d.alloc();
  body.getPosAtTime(this.world.now, bodyPos);
  this.vec4.setXYZ(bodyPos.x, bodyPos.y, 0);
  this.vec4.transform(this.viewMatrix);
  if (body.shape == Body.Shape.RECT) {
    vol = Math.min(1, mag*mag/300);
    if (vol > 0.01) {
      dur = Math.min(0.1, 0.01 * mag*mag);
      freq = mag + 200 + 5 * Math.random();
      freq2 = 1;//freq;// + 5 * (Math.random() - 0.5);
      this.sfx.sound(this.vec4.v[0], this.vec4.v[1], 0, vol, 0, 0, dur, freq, freq2, 'square');
    }
  } else {
    mass = body.mass;
    var massSqrt = Math.sqrt(mass);
    vol = Math.min(1, 0.005*mag*mag);
    if (vol > 0.01) {
      freq = 200 + 10000 / massSqrt;
      freq2 = 1;//freq/10;//freq * (1 + (Math.random() - 0.5) * 0.01);
      dur = Math.min(0.2, Math.max(Math.sqrt(mass) / 600, 0.05));
      this.sfx.sound(this.vec4.v[0], this.vec4.v[1], 0, vol, 0, 0, dur, freq, freq2, 'sine');
    }
  }
  bodyPos.free();
};

PlayScreen.prototype.updateViewMatrix = function() {
  var br = this.worldBoundingRect;
  this.viewMatrix.toIdentity();
  var ratio = Math.min(this.canvas.height / br.rad.y, this.canvas.width / br.rad.x);
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              ratio / this.canvas.width,
              ratio / this.canvas.height,
          0.2));

  // scale
  var v = this.visibility;
  this.viewMatrix.multiply(this.mat4.toScaleOpXYZ(3 - v*2, v * v, 1));

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -br.pos.x,
      -br.pos.y,
      0));

  this.renderer.setViewMatrix(this.viewMatrix);
};

PlayScreen.prototype.drawScene = function() {
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.renderer
      .setStamp(this.levelStamp)
      .setColorVector(this.levelColorVector)
      .setModelMatrix(this.levelModelMatrix)
      .drawStamp();

  // Animate whenever this thing draws.
  this.controller.requestAnimation();
};

PlayScreen.prototype.unloadLevel = function() {
  if (this.world) {
    for (var spiritId in this.world.spirits) {
      var s = this.world.spirits[spiritId];
      var b = this.world.bodies[s.bodyId];
      this.world.removeBodyId(b.id);
      this.world.removeSpiritId(spiritId);
    }
    this.world = null;
  }
  // TODO this should be level Stamps, not permStamps. permStamps are permanent.
  while (this.permStamps.length) {
    this.permStamps.pop().dispose(this.renderer.gl);
  }
  this.permStamps = null;
};