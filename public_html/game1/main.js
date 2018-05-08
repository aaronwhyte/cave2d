var game1;
function main() {
  game1 = new Game1(document.querySelector('#canvas'));
  game1.start();
}

function Game1(canvas) {
  this.canvas = canvas;
  this.soundUnlocked = false;
  this.animateFrameFn = this.animateFrame.bind(this);
}

Game1.prototype.start = function() {
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // on-event sound unlocker for iOS, Chrome, etc.
  document.body.addEventListener('mouseup', this.unlockSound.bind(this));
  document.body.addEventListener('touchend', this.unlockSound.bind(this));
  document.body.addEventListener('keydown', this.unlockSound.bind(this));
};

var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;

Game1.SCREEN_TITLE = 'title';
Game1.SCREEN_PLAY = 'play';
Game1.SCREEN_PAUSE = 'pause';

Game1.SCREENS = [Game1.SCREEN_TITLE, Game1.SCREEN_PLAY, Game1.SCREEN_PAUSE];

Game1.prototype.unlockSound = function() {
  if (!this.soundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.soundUnlocked = true;
  }
};

Game1.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.requestAnimation();
};

Game1.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Game1.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Game1.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Game1.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Game1.SCREENS.length; i++) {
    var screen = Game1.SCREENS[i];
    this.visibility[screen] = screen == Game1.SCREEN_TITLE ? 1 : 0;
  }
  this.frontScreenId = Game1.SCREEN_TITLE;
  this.animationRequested = false;
};

Game1.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Game1.prototype.animateFrame = function() {
  this.animationRequested = false;
  this.renderer.resize().clear();
  for (var i = 0; i < Game1.SCREENS.length; i++) {
    var id = Game1.SCREENS[i];
    var oldVisibility = this.visibility[id];
    var seconds = 0.2;
    if (this.frontScreenId == id) {
      this.visibility[id] = Math.min(1, this.visibility[id] + 1 / (seconds * 60));
    } else {
      this.visibility[id] = Math.max(0, this.visibility[id] - 1 / (seconds * 60));
    }
    this.screens[id].setScreenListening(this.frontScreenId == id);
    if (this.visibility[id]) {
      this.screens[id].drawScreen(this.visibility[id]);
    }
    if (oldVisibility != this.visibility[id]) {
      this.requestAnimation();
    }
  }
};

Game1.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
  this.requestAnimation();
};

Game1.prototype.quit = function() {
  this.exitPointerLock();
  this.screens[Game1.SCREEN_PLAY].unloadLevel();
  this.gotoScreen(Game1.SCREEN_TITLE);
};

Game1.prototype.restart = function() {
  this.screens[Game1.SCREEN_PLAY].unloadLevel();
  this.requestAnimation();
};

Game1.prototype.requestFullScreen = function() {
  var elem = document.body;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
  }
  this.requestAnimation();
};

Game1.prototype.requestPointerLock = function() {
  this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
      this.canvas.mozRequestPointerLock ||
      this.canvas.webkitRequestPointerLock;
  if (this.canvas.requestPointerLock) {
    this.canvas.requestPointerLock();
  }
  this.requestAnimation();
};

Game1.prototype.exitPointerLock = function() {
  document.exitPointerLock = document.exitPointerLock ||
      document.mozExitPointerLock ||
      document.webkitExitPointerLock;
  if (document.exitPointerLock) {
    document.exitPointerLock();
  } else {
    console.log('exitPointerLock UNPOSSIBLE');
  }
  this.requestAnimation();
};

Game1.prototype.requestAnimation = function() {
  if (!this.animationRequested) {
    this.animationRequested = true;
    requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

