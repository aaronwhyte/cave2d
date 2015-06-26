/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
  this.requestPointerLockFn = this.getRequestPointerLockFn();

  this.trackball = new MultiTrackball();
  this.trackball.addTrackball(new MouseTrackball());
  this.trackball.addTrackball(new TouchTrackball());

  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.prototype.getRequestPointerLockFn = function() {
  var controller = this.controller;
  return function() {
    controller.requestPointerLock();
  };
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (!this.listening && listen) {
    document.body.addEventListener('click', this.requestPointerLockFn);
    this.trackball.startListening();
  }
  if (this.listening && !listen) {
    this.controller.exitPointerLock();
    document.body.removeEventListener('click', this.requestPointerLockFn);
    this.trackball.stopListening();
  }
  BaseScreen.prototype.setScreenListening.call(this, listen);
};

PlayScreen.prototype.initWorld = function() {
  var labelMaker = new LabelMaker(this.glyphs);

  var controller = this.controller;
  var sfx = this.sfx;

  var buttonMaker = new ButtonMaker(labelMaker, this.world, this.multiPointer, this.renderer);
  buttonMaker
      .setNextCharMatrix(new Matrix44().toTranslateOpXYZ(3, 0, 0))
      .setPaddingXY(1.5, 0.5);

  // PAUSE
  buttonMaker.setLetterColor([0, 0, 0]).setBlockColor([1, 1, 1]).setScale(2).setPaddingXY(3, 2);
  var spiritId = buttonMaker.addButton(115, 80, "PAUSE", function(world, x, y) {
    var attack = 0.04;
    var sustain = 0;
    var decay = 0.3;
    sfx.sound(x, y, 0, 0.5, attack, sustain, decay, 1000, 100, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
    controller.gotoScreen(Main30.SCREEN_PAUSE);
  });
  this.setSpaceButtonSpirit(this.world.spirits[spiritId]);

  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  var sphereModel = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  var wut = Math.random() * 300;
  for (var i = 0; i < sphereModel.vertexes.length; i++) {
    var vertex = sphereModel.vertexes[i];
    var c = Math.ceil(Math.round((Math.sin(vertex.position.v[0] * vertex.position.v[1] * vertex.position.v[2] * wut)) + 2) / 2);
    vertex.color.setXYZ(c, c, c);
  }
  this.sphereStamp = sphereModel.createModelStamp(this.renderer.gl);

  this.ballSpiritId = this.initBall(0, 0, 4, 0.5, 1.5, 0, 0);
  this.initBalls();
  this.initWalls();

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
};

PlayScreen.prototype.initBalls = function() {
  for (var i = 0; i < 20; i++) {
    var r = i ? (3 + Math.random() * 10) : 30;
    this.initBall(
            (140 - r) * (Math.random() - 0.5) * 2,
            (90 - r) * (Math.random() - 0.5) * 2,
            r, 1,
            Math.random() * 0.5 + 0.5, Math.random() + 0.8, Math.random()+ 0.8);
  }
};

PlayScreen.prototype.initBall = function(x, y, rad, density, red, green, blue) {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosXYAtTime(x, y, this.world.now);
  b.rad = rad;
  b.hitGroup = 0;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = PATH_DURATION * 3;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.sphereStamp);
  var spiritId = this.world.addSpirit(spirit);
  this.world.spirits[spiritId].setColorRGB(red, green, blue);
  return spiritId;
};

PlayScreen.prototype.initWalls = function() {
  var rad = 100;
  this.initWall(rad * 1.5, 0, 1, rad);
  this.initWall(-rad * 1.5, 0, 1, rad);
  this.initWall(0, rad, rad * 1.5, 1);
  this.initWall(0, -rad, rad * 1.5, 1);
};

PlayScreen.prototype.initWall = function(x, y, h, v) {
  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  b.setPosXYAtTime(x, y, this.world.now);
  b.rectRad.setXY(h, v);
  b.hitGroup = 0;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new WallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.cubeStamp);
  return this.world.addSpirit(spirit);
};

PlayScreen.prototype.handleInput = function() {
  var spirit = this.world.spirits[this.ballSpiritId];
  var body = this.world.bodies[spirit.bodyId];
  var newVel = Vec2d.alloc();
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    newVel.setXY(this.movement.x, -this.movement.y);
    var accel = Vec2d.alloc().set(newVel).subtract(body.vel);
    var maxAccel = 3;
    accel.clipToMaxLength(maxAccel);
    newVel.set(body.vel).add(accel);
    body.setVelAtTime(newVel, this.world.now);
    accel.free();
  } else {
//    var oldSpeedSquared = body.vel.magnitudeSquared();
//    var newSpeedSquared = 0.99 * oldSpeedSquared;
//    var newSpeed = Math.sqrt(newSpeedSquared);
//    newVel.set(body.vel).scaleToLength(newSpeed);
//    body.setVelAtTime(newVel, this.world.now);
  }
  newVel.free();
  this.trackball.reset();
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

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -br.pos.x,
      -br.pos.y,
      0));

  // rotate
  var viz3 = this.visibility;
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(br.pos.x, br.pos.y, 0));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 200 * (1 - viz3), 4 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(-Math.PI*0.5 * (1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
