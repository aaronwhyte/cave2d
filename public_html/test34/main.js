var test34;
function main() {
  test34 = new Test34(document.querySelector('#canvas'));
  test34.start();
}

function Test34(canvas) {
  this.canvas = canvas;
  this.iosSoundUnlocked = false;
  this.animateFrameFn = this.animateFrame.bind(this);
}

Test34.prototype.start = function() {
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

Test34.SCREEN_TITLE = 'title';
Test34.SCREEN_PLAY = 'play';
Test34.SCREEN_PAUSE = 'pause';

Test34.SCREENS = [Test34.SCREEN_TITLE, Test34.SCREEN_PLAY, Test34.SCREEN_PAUSE];

Test34.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Test34.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.requestAnimation();
};

Test34.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Test34.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Test34.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Test34.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Test34.SCREENS.length; i++) {
    var screen = Test34.SCREENS[i];
    this.visibility[screen] = screen == Test34.SCREEN_TITLE ? 1 : 0;
  }
  this.frontScreenId = Test34.SCREEN_TITLE;
  this.animationRequested = false;
};

Test34.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Test34.prototype.animateFrame = function() {
  this.animationRequested = false;
  this.renderer.resize().clear();
  for (var i = 0; i < Test34.SCREENS.length; i++) {
    var id = Test34.SCREENS[i];
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

Test34.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
  this.requestAnimation();
};

Test34.prototype.quit = function() {
  this.exitPointerLock();
  this.screens[Test34.SCREEN_PLAY].unloadLevel();
  this.gotoScreen(Test34.SCREEN_TITLE);
};

Test34.prototype.restart = function() {
  this.screens[Test34.SCREEN_PLAY].unloadLevel();
  this.requestAnimation();
};

Test34.prototype.requestFullScreen = function() {
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

Test34.prototype.requestPointerLock = function() {
  this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
      this.canvas.mozRequestPointerLock ||
      this.canvas.webkitRequestPointerLock;
  if (this.canvas.requestPointerLock) {
    this.canvas.requestPointerLock();
  }
  this.requestAnimation();
};

Test34.prototype.exitPointerLock = function() {
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

Test34.prototype.requestAnimation = function() {
  if (!this.animationRequested) {
    this.animationRequested = true;
    requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

