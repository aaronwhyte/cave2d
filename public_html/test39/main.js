var test39;
function main() {
  test39 = new Test39(document.querySelector('#canvas'));
  test39.start();
}

function Test39(canvas) {
  this.canvas = canvas;
  this.iosSoundUnlocked = 0;
  this.animateFrameFn = this.animateFrame.bind(this);
}

Test39.prototype.start = function() {
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // On-event sound unlocker for iOS.
  this.canvas.addEventListener('touchend', this.unlockIosSound.bind(this));
};

Test39.SCREEN_PLAY = 'play';

Test39.SCREENS = [Test39.SCREEN_PLAY];

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
Test39.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

Test39.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initScreens();
  this.requestAnimation();
};

Test39.prototype.initScreens = function() {
  this.initStamps();
  this.screens = {};
  this.screens[Test39.SCREEN_PLAY] = new PlayScreen(this, this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);

  this.visibility = {};
  for (var i = 0; i < Test39.SCREENS.length; i++) {
    var screen = Test39.SCREENS[i];
    this.visibility[screen] = screen == Test39.SCREEN_PLAY ? 1 : 0;
  }
  this.frontScreenId = Test39.SCREEN_PLAY;
  this.animationRequested = false;
};

Test39.prototype.initStamps = function() {
  var glyphMaker = new GlyphMaker(0.4, 1.2);
  this.glyphs = new Glyphs(glyphMaker);
  var glyphStamps = this.glyphs.initStamps(this.renderer.gl);
  this.stamps = {};
  for (var key in glyphStamps) {
    this.stamps[key] = glyphStamps[key];
  }
};

/**
 * Manages changing screen visibility, and calls drawScreen() on visible screens.
 */
Test39.prototype.animateFrame = function() {
  this.animationRequested = false;
  this.renderer.resize().clear();
  for (var i = 0; i < Test39.SCREENS.length; i++) {
    var id = Test39.SCREENS[i];
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

Test39.prototype.gotoScreen = function(screenId) {
  this.frontScreenId = screenId;
  this.requestAnimation();
};

Test39.prototype.restart = function() {
  this.screens[Test39.SCREEN_PLAY].unloadLevel();
  this.requestAnimation();
};

Test39.prototype.requestFullScreen = function() {
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

Test39.prototype.requestAnimation = function() {
  if (!this.animationRequested) {
    this.animationRequested = true;
    requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

