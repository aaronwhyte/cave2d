function main() {
  var main30 = new Main30();
}

function Main30() {
  this.canvas = document.querySelector('#canvas');
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 0.1);

  // on-event sound unlocker for iOS
  this.iosSoundUnlocked = false;
  document.body.addEventListener('mousedown', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchstart', this.unlockIosSound.bind(this));
}

var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;

Main30.SCREEN_TITLE = 'title';
Main30.SCREEN_PLAY = 'play';
Main30.SCREEN_PAUSE = 'pause';

Main30.SCREENS = [Main30.SCREEN_TITLE, Main30.SCREEN_PLAY, Main30.SCREEN_PAUSE];

Main30.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Main30.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.loop();
};

Main30.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Main30.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main30.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main30.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Main30.SCREENS.length; i++) {
    this.visibility[Main30.SCREENS[i]] = 0;
  }

  this.frontScreenId = Main30.SCREEN_TITLE;
};

Main30.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Main30.prototype.loop = function() {
  if (!this.loopFn) {
    this.loopFn = this.loop.bind(this);
  }
  this.renderer.resize().clear();
  for (var i = 0; i < Main30.SCREENS.length; i++) {
    var id = Main30.SCREENS[i];
    var step = 0.5;
    if (this.frontScreenId == id) {
      this.visibility[id] = Math.min(1, this.visibility[id] + step/15);
    } else {
      this.visibility[id] = Math.max(0, this.visibility[id] - step/20);
    }
    this.screens[id].setScreenListening(this.frontScreenId == id);
    if (this.visibility[id]) {
      this.screens[id].drawScreen(this.visibility[id]);
    }
  }
  requestAnimationFrame(this.loopFn, this.canvas);
};

Main30.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
};

Main30.prototype.requestFullScreen = function() {
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
};

Main30.prototype.requestPointerLock = function() {
  this.canvas.requestPointerLock = this.canvas.requestPointerLock ||
      this.canvas.mozRequestPointerLock ||
      this.canvas.webkitRequestPointerLock;
  if (this.canvas.requestPointerLock) {
    this.canvas.requestPointerLock();
  }
};

Main30.prototype.exitPointerLock = function() {
  document.exitPointerLock = document.exitPointerLock ||
      document.mozExitPointerLock ||
      document.webkitExitPointerLock;
  if (document.exitPointerLock) {
    document.exitPointerLock();
  } else {
    console.log('exitPointerLock UNPOSSIBLE');
  }
};
