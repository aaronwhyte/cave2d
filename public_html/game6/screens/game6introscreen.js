/**
 * @constructor
 * @extends {Game6BaseScreen}
 */
function Game6IntroScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game6BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.vec4 = new Vec4();
  this.textMatrix = new Matrix44();
  this.updateViewMatrix();
  this.initPauseButtons();
  this.introGlyphs = new Glyphs(new GlyphMaker(0.5, 1), false);
  this.introGlyphs.initModels();
  this.introGlyphs.initStamps(this.renderer.gl);
  this.printer = new Printer(this.renderer, this.introGlyphs.stamps);
}
Game6IntroScreen.prototype = new Game6BaseScreen();
Game6IntroScreen.prototype.constructor = Game6IntroScreen;

Game6IntroScreen.FRICTION = 0.05;

Game6IntroScreen.EXIT_DURATION = 30 * Game6IntroScreen.EXIT_WARP_MULTIPLIER;


/**
 * @returns {number}
 * @override
 */
Game6IntroScreen.prototype.getClocksPerFrame = function() {
  return 0.5;
};

Game6IntroScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;

  Game6BaseScreen.prototype.setScreenListening.call(this, listen);

  let buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'),
      buttonEvents, this.fullScreenFn);
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
};

Game6IntroScreen.prototype.initPauseButtons = function() {
  // There are no pause buttons!

  // this.pauseKeyTrigger = new KeyTrigger();
  // this.pauseKeyTrigger
  //     .addTriggerKeyByName(Key.Name.SPACE)
  //     .addTriggerDownListener(this.pauseDownFn);
  // this.addListener(this.pauseKeyTrigger);
};

Game6IntroScreen.prototype.startExit = function(pos) {
  if (this.exitStartTime) return;
  this.sounds.exit(pos);
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game6IntroScreen.EXIT_DURATION;
  this.splashes.addExitSplash(pos.x, pos.y, this.exitStartTime, Game6IntroScreen.EXIT_DURATION);
};

Game6IntroScreen.prototype.exitLevel = function() {
  this.controller.exitLevel(this.createGameState());
};

Game6IntroScreen.prototype.onHitEvent = function(e) {
  if (e.time !== this.now()) {
    console.error('onHitEvent e.time !== this.now()', e.time, this.now());
  }
  let b0 = this.world.getBodyByPathId(e.pathId0);
  let b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game6IntroScreen.prototype.drawScene = function() {
  this.processDistGrid();
  this.getCamera().setXY(0, 0);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setTime(this.now());
  this.drawTiles();
  this.drawSpirits();
  this.splasher.drawWithModelIds(this, this.world.now);
  this.flushBatchDrawers();

  this.drawText();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game6IntroScreen.prototype.drawText = function() {
  if (!this.startTime) {
    this.startTime = this.now();
  }
  // Squish all the text drawing into the front of the z buffer.
  let squish = 10000;
  let width = 0.04 * Math.min(this.canvas.width * 0.25, this.canvas.height * 0.33);
  this.viewMatrix
      .toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          width / this.canvas.width,
          width / this.canvas.height,
          1 / squish))
      .multiply(this.mat44.toTranslateOpXYZ(0, 0, -squish * 0.9))
  ;
  this.renderer.setViewMatrix(this.viewMatrix);

  let sep = 30;
  let off = 7;
  let size = 10;
  let titleY = this.canvas.height / width - sep;
  let delay = 20;
  let start = 50;

  let ds = 0.1;

  this.drawGlyph('G', -2 * sep - off, titleY, size, start,              -2,  -1, ds,  0.1, -0.13,  0.01);
  this.drawGlyph('A', -1 * sep - off, titleY, size, start + delay,    -0.3,   2, ds,  0.3,  0,     0);
  this.drawGlyph('M',  - off,         titleY, size, start + 2*delay,     0,  -3, ds,  0.0, -0.15,  0);
  this.drawGlyph('E', sep - off,      titleY, size, start + 3*delay,     1,  -2, ds, -0.1,  0.1,   0);
  this.drawGlyph('6', 2 * sep + off,  titleY, size, start + 5.5*delay, 0.3, 0.2,  0,  0,    0,    -0.015);


  // subtitle
  if (!this.startMatrix) this.startMatrix = new Matrix44();
  if (!this.nextCharMatrix) this.nextCharMatrix = new Matrix44();
  let text = 'COMING SOON...';
  let letterSize = 4;
  let spacingFraction = 3.1;
  this.startMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          letterSize,
          letterSize,
          1 / squish))
      .multiply(this.mat44.toTranslateOpXYZ(
          -spacingFraction * (text.length - 1) / 2,
          (-this.canvas.height / width) / letterSize + spacingFraction * 1.5,
          0));
  this.nextCharMatrix.toTranslateOpXYZ(spacingFraction, 0, 0);
  this.printer.printLine(this.startMatrix, this.nextCharMatrix, text);
};

Game6IntroScreen.prototype.drawGlyph = function(c, x0, y0, s0, t0, dx, dy, ds, drx, dry, drz) {
  let t = 0.02 * Math.pow(Math.max(0, this.startTime + t0 - this.now()), 2);

  let x = x0 + dx * t;
  let y = y0 + dy * t;
  let s = Math.max(0, s0 + ds * t);
  let rx = drx * t;
  let ry = dry * t;
  let rz = drz * t;

  this.textMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(x, y, 0))
      .multiply(this.mat44.toScaleOpXYZ(s, s, s))
      .multiply(this.mat44.toRotateXOp(rx))
      .multiply(this.mat44.toRotateYOp(ry))
      .multiply(this.mat44.toRotateZOp(rz))
  ;
  let b = Math.max(0, 1 - t / 10);
  let n = -this.now() * 0.05;
  this.renderer
      .setColorVector(this.vec4.setXYZ(b, b*b, b))
      // .setColorVector(this.vec4.setXYZ(
      //     b * (0.9 + 0.1 * (Math.sin(t0 * 0.1 + n) * 0.5 + 0.5)),
      //     b * (0.2 * (Math.sin(t0*0.1 + 2 * Math.PI * 0.33 + n*0.8731231) / 2 + 0.5)),
      //     Math.pow(b * (0.9 + 0.1 * (Math.sin(t0*0.1 + 2 * Math.PI * 0.66 + n * 0.7298712) / 2 + 0.5)), 10)
      // ))
      .setStamp(this.introGlyphs.stamps[c])
      .setModelMatrix(this.textMatrix)
      .drawStamp();
};

Game6IntroScreen.prototype.isPlaying = function() {
  return true;
};

Game6IntroScreen.prototype.distOutsideViewCircles = function(pos) {
  return 0;
};