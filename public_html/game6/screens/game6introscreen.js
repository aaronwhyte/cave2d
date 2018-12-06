/**
 * @constructor
 * @extends {Game6BaseScreen}
 */
function Game6IntroScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game6BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();
  this.initPauseButtons();
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
  this.pauseKeyTrigger = new KeyTrigger();
  this.pauseKeyTrigger
      .addTriggerKeyByName(Key.Name.SPACE)
      .addTriggerDownListener(this.pauseDownFn);
  this.addListener(this.pauseKeyTrigger);
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
  this.getCamera().setXY(0, 0);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setTime(this.now());
  this.drawTiles();
  this.drawSpirits();

  this.splasher.drawWithModelIds(this, this.world.now);
  this.flushBatchDrawers();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game6IntroScreen.prototype.isPlaying = function() {
  return true;
};

Game6IntroScreen.prototype.distOutsideViewCircles = function(pos) {
  return 0;
};