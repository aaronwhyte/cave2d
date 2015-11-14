var test35;
function main() {
  test35 = new Test35(document.querySelector('#canvas'));
  test35.start();
}

function Test35(canvas) {
  this.canvas = canvas;
  this.iosSoundUnlocked = false;
  this.animateFrameFn = this.animateFrame.bind(this);
}

Test35.prototype.start = function() {
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // on-event sound unlocker for iOS
  document.body.addEventListener('mouseup', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchend', this.unlockIosSound.bind(this));
};

var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;

Test35.SCREEN_TITLE = 'title';
Test35.SCREEN_PLAY = 'play';
Test35.SCREEN_PAUSE = 'pause';

Test35.SCREENS = [Test35.SCREEN_TITLE, Test35.SCREEN_PLAY, Test35.SCREEN_PAUSE];

Test35.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Test35.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.requestAnimation();
};

Test35.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Test35.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Test35.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Test35.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Test35.SCREENS.length; i++) {
    var screen = Test35.SCREENS[i];
    this.visibility[screen] = screen == Test35.SCREEN_TITLE ? 1 : 0;
  }
  this.frontScreenId = Test35.SCREEN_TITLE;
  this.animationRequested = false;
};

Test35.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Test35.prototype.animateFrame = function() {
  this.animationRequested = false;
  this.renderer.resize().clear();
  for (var i = 0; i < Test35.SCREENS.length; i++) {
    var id = Test35.SCREENS[i];
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

Test35.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
  this.requestAnimation();
};

Test35.prototype.quit = function() {
  this.exitPointerLock();
  this.screens[Test35.SCREEN_PLAY].unloadLevel();
  this.gotoScreen(Test35.SCREEN_TITLE);
};

Test35.prototype.restart = function() {
  this.screens[Test35.SCREEN_PLAY].unloadLevel();
  this.requestAnimation();
};

Test35.prototype.requestFullScreen = function() {
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

Test35.prototype.requestPointerLock = function() {
  this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
      this.canvas.mozRequestPointerLock ||
      this.canvas.webkitRequestPointerLock;
  if (this.canvas.requestPointerLock) {
    this.canvas.requestPointerLock();
  }
  this.requestAnimation();
};

Test35.prototype.exitPointerLock = function() {
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

Test35.prototype.requestAnimation = function() {
  if (!this.animationRequested) {
    this.animationRequested = true;
    requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

