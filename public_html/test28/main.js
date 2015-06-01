function main() {
  var main28 = new Main28();
}

function Main28() {
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

Main28.SCREEN_TITLE = 'title';
Main28.SCREEN_PLAY = 'play';
Main28.SCREEN_PAUSE = 'pause';

Main28.SCREENS = [Main28.SCREEN_TITLE, Main28.SCREEN_PLAY, Main28.SCREEN_PAUSE];

Main28.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Main28.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.loop();
};

Main28.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Main28.SCREEN_TITLE] = new TitleScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main28.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.screens[Main28.SCREEN_PAUSE] = new PauseScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Main28.SCREENS.length; i++) {
    this.visibility[Main28.SCREENS[i]] = 0;
  }

  this.frontScreenId = Main28.SCREEN_TITLE;
};

Main28.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

Main28.prototype.loop = function() {
  if (!this.loopFn) {
    this.loopFn = this.loop.bind(this);
  }
  this.renderer.resize().clear();
  for (var i = 0; i < Main28.SCREENS.length; i++) {
    var id = Main28.SCREENS[i];
    if (this.frontScreenId == id) {
      this.visibility[id] = Math.min(1, this.visibility[id] + 1/20);
    } else {
      this.visibility[id] = Math.max(0, this.visibility[id] - 1/60);
    }
    this.screens[id].setScreenListening(this.visibility[id] > 0.9);
    if (this.visibility[id]) {
      this.screens[id].drawScreen(this.visibility[id]);
    }
  }
  requestAnimationFrame(this.loopFn, this.canvas);
};

Main28.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
};
