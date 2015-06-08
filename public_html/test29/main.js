function main() {
  var main29 = new Main29();
}

function Main29() {
  this.titleScreen = null;
  this.playScreen = null;

  this.canvas = document.querySelector('#canvas');
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();

  // on-event sound unlocker for iOS
  this.iosSoundUnlocked = false;
  document.body.addEventListener('mousedown', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchstart', this.unlockIosSound.bind(this));
}

var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;

Main29.SCREEN_TITLE = 'title';
Main29.SCREEN_PLAY = 'play';
Main29.SCREEN_PAUSE = 'pause';

Main29.SCREENS = [Main29.SCREEN_TITLE, Main29.SCREEN_PLAY, Main29.SCREEN_PAUSE];

Main29.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Main29.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.loop();
};

Main29.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Main29.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main29.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main29.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Main29.SCREENS.length; i++) {
    this.visibility[Main29.SCREENS[i]] = 0;
  }

  this.frontScreenId = Main29.SCREEN_TITLE;
};

Main29.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Main29.prototype.loop = function() {
  if (!this.loopFn) {
    this.loopFn = this.loop.bind(this);
  }
  this.renderer.resize().clear();
  for (var i = 0; i < Main29.SCREENS.length; i++) {
    var id = Main29.SCREENS[i];
    var step = 0.5;
    if (this.frontScreenId == id) {
      this.visibility[id] = Math.min(1, this.visibility[id] + step/15);
    } else {
      this.visibility[id] = Math.max(0, this.visibility[id] - step/30);
    }
    this.screens[id].setScreenListening(this.visibility[id] > 0.9);
    if (this.visibility[id]) {
      this.screens[id].drawScreen(this.visibility[id]);
    }
  }
  requestAnimationFrame(this.loopFn, this.canvas);
};

Main29.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
};

Main29.prototype.requestFullScreen = function() {
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