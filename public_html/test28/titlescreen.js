/**
 * @constructor
 * @extends {Screen}
 */
function TitleScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  Screen.call(this);
  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.glyphs = glyphs;
  this.stamps = stamps;
  this.sfx = sound;

  this.viewMatrix = new Matrix44();
  this.mat4 = new Matrix44();
  this.multiPointer = new MultiPointer(this.canvas, this.viewMatrix);
  this.readyToDraw = false;
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
}
TitleScreen.prototype = new Screen();
TitleScreen.prototype.constructor = TitleScreen;

TitleScreen.prototype.setScreenListening = function(listen) {
  if (listen) {
    this.multiPointer.startListening();
  } else {
    this.multiPointer.stopListening();
  }
};

TitleScreen.prototype.drawScreen = function(visibility) {
  this.visibility = visibility;
  if (!this.readyToDraw) {
    this.initWorld();
    this.readyToDraw = true;
  }
  this.clock();
  this.updateViewMatrix(Date.now());
  this.drawScene();
  this.multiPointer.clearEventQueue();
  this.multiPointer.setViewMatrix(this.viewMatrix);
};

TitleScreen.prototype.destroyScreen = function() {
  // Unload button models? Need a nice utility for loading, remembering, and unloading models.
};

TitleScreen.prototype.initWorld = function() {
  this.world = new World();
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 1;
  this.labelMaker = new LabelMaker(this.glyphs);
  this.startMatrix = new Matrix44();
  this.nextCharMatrix = new Matrix44().toTranslateOpXYZ(3, 0, 0);

  var controller = this.controller;

  var sfx = this.sfx;
  this.addButton("TEST 28", function(world, x, y) {});

  this.addButton("PLAY?", function(world, x, y) {
    var freq = 0;
    for (var delay = 0; delay < 0.3; delay += Math.random() * 0.1 + 0.05) {
      freq += 300 + 1000 * Math.random();
      var attack = 0.01;
      var sustain = (4 + Math.random() * 2) / 60;
      var decay = (20 + 10 * Math.random()) / 60;
      sfx.sound(x, y, 0, 0.5, attack, sustain, decay, freq, 1, 'sine', delay);
      sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq * (2 + Math.random()), 1, 'square', delay);
    }
    this.lastSoundMs = Date.now();
    this.soundLength = (attack + sustain + decay + delay) * 1000;
    controller.gotoScreen(Main28.SCREEN_PLAY);
  });
};

TitleScreen.prototype.addButton = function(text, func) {
  var labelModel = this.labelMaker.createLabelModel(this.startMatrix, this.nextCharMatrix, text);
  var brect = labelModel.getBoundingRect().padXY(1.5, 0.5);

  labelModel.transformPositions(new Matrix44().toTranslateOpXYZ(-brect.pos.x, -brect.pos.y, -0.6));
  for (var i = 0; i < labelModel.vertexes.length; i++) {
    var vert = labelModel.vertexes[i];
    vert.setColorRGB(1.5, 2, 1);
  }
  var cuboid = RigidModel.createCube();
  cuboid.transformPositions(new Matrix44().toScaleOpXYZ(brect.rad.x, brect.rad.y, 1));
  cuboid.transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, 1));
  var bright = 0.9;
  for (var i = 0; i < cuboid.vertexes.length; i++) {
    var vert = cuboid.vertexes[i];
    vert.setColorRGB(1.5 * bright, 2 * bright, 0.9 * bright);
  }
  labelModel.addRigidModel(cuboid);
  labelModel.transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -1));


  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  var pos = new Vec2d(0, -6 * this.nextButtonNum);
  b.setPosAtTime(pos, this.world.now);
  this.nextButtonNum++;
  b.rectRad.set(brect.rad);
  b.group = 0;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new ButtonSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setMultiPointer(this.multiPointer);
  spirit.setModelStamp(labelModel.createModelStamp(this.renderer.gl));
  spirit.setOnClick(func);
  this.world.addSpirit(spirit);
  this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
};

TitleScreen.prototype.clock = function() {
  var endTimeMs = Date.now() + MS_PER_FRAME;
  var endClock = this.world.now + CLOCKS_PER_FRAME;

  if (this.lastPathRefreshTime + PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.shape === Body.Shape.CIRCLE) {
        b.invalidatePath();
        b.moveToTime(this.world.now);
      }
    }
  }

  var e = this.world.getNextEvent();
  // Stop if there are no more events to process, or we've moved the game clock far enough ahead
  // to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.

  while (e && e.time <= endClock && Date.now() <= endTimeMs) {
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = this.world.getBodyByPathId(e.pathId0);
      var b1 = this.world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
      }
    }
    this.world.processNextEvent();
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};

TitleScreen.prototype.drawScene = function() {
  this.clock();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
};

TitleScreen.prototype.updateViewMatrix = function() {
  var br = this.worldBoundingRect;

  this.viewMatrix.toIdentity();

  var ratio = Math.min(this.canvas.height, this.canvas.width) / (1 * Math.max(br.rad.x, br.rad.y));
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              ratio / this.canvas.width,
              ratio / this.canvas.height,
              0.15));

  // Shear
  this.mat4.toIdentity();
  this.mat4.setColRowVal(2, 1, -0.7);
  this.viewMatrix.multiply(this.mat4);

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -30 * (this.visibility - 1) * (this.visibility - 1) * (this.visibility - 1) - br.pos.y, 0));

  // rotate
  var viz3 = this.visibility * this.visibility;
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(br.pos.x, br.pos.y, 0));
  this.viewMatrix.multiply(this.mat4.toRotateZOp(Math.PI * viz3 / 8));
  this.viewMatrix.multiply(this.mat4.toRotateXOp(((6 * viz3) - 5) * Math.PI / 10));
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(-br.pos.x, -br.pos.y, 0));

  this.renderer.setViewMatrix(this.viewMatrix);
};
