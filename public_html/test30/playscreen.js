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
  buttonMaker.setLetterColor([0.25, 0.25, 0.25]).setBlockColor(null);
  var spiritId = buttonMaker.addButton(0, -1, "PAUSE", function(world, x, y) {
    var attack = 0.04;
    var sustain = 0;
    var decay = 0.3;
    sfx.sound(x, y, 0, 0.5, attack, sustain, decay, 1000, 100, 'square');
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay) * 1000;
    controller.gotoScreen(Main30.SCREEN_PAUSE);
  });
  this.setSpaceButtonSpirit(this.world.spirits[spiritId]);

  for (var spiritId in this.world.spirits) {
    var s = this.world.spirits[spiritId];
    var b = this.world.bodies[s.bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
  this.worldBoundingRect.coverXY(0, -75);

  this.ballSpiritId = this.initBigBall();
};


PlayScreen.prototype.initBigBall = function() {
  var model = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  var pos = new Vec2d(0, -50);
  b.setPosAtTime(pos, this.world.now);
  b.rad = 5;
  b.hitGroup = 1;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad;
  b.pathDurationMax = 1;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setMultiPointer(this.multiPointer);
  spirit.setModelStamp(model.createModelStamp(this.renderer.gl));
  return this.world.addSpirit(spirit);
};

PlayScreen.prototype.handleInput = function() {
  var spirit = this.world.spirits[this.ballSpiritId];
  var body = this.world.bodies[spirit.bodyId];
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    var newVel = Vec2d.alloc().setXY(this.movement.x, -this.movement.y);
    var accel = Vec2d.alloc().set(newVel).subtract(body.vel);
    var maxAccel = 2;
    accel.clipToMaxLength(maxAccel);
    newVel.set(body.vel).add(accel);
    body.setVelAtTime(newVel, this.world.now);
    accel.free();
    newVel.free();
  } else {
    var oldSpeedSquared = body.vel.magnitudeSquared();
    var newSpeedSquared = 0.95 * oldSpeedSquared;
    var newSpeed = Math.sqrt(newSpeedSquared);
    var newVel = Vec2d.alloc().set(body.vel).scaleToLength(newSpeed);
    body.setVelAtTime(newVel, this.world.now);
    newVel.free();
  }
  this.trackball.reset();
};


PlayScreen.prototype.updateViewMatrix = function() {
  var br = this.worldBoundingRect;
  this.viewMatrix.toIdentity();
  var ratio = this.canvas.height / br.rad.y;
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

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(0, 0, 17 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(-Math.PI*0.1 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateYOp(-Math.PI*0.1 * (1 - viz3)));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(-Math.PI*0.5 * (1 - viz3)));

  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
