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

var ZOOM = 26;
var MS_PER_FRAME = 1000 / 60;
var CLOCKS_PER_FRAME = 0.5;
var PATH_DURATION = CLOCKS_PER_FRAME * 2;

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
  this.titleScreen = new TitleScreen(this.canvas, this.renderer, this.glyphs, this.stamps, this.sfx);
  this.titleScreen.setScreenListening(true);
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
  var titleVis = Math.min(1, Math.abs(1.5 * Math.sin(Date.now() / 500)));
  this.titleScreen.drawScreen(titleVis);
  this.titleScreen.setScreenListening(titleVis == 1);
  requestAnimationFrame(this.loopFn, this.canvas);
};


function drawBody(b) {
  b.getPosAtTime(world.now, bodyPos);
  if (b.shape == Body.Shape.RECT) {
    modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
    modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rectRad.x, b.rectRad.y, 1)));
  } else {
    modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
    modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rad, b.rad, b.rad)));
  }
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
}

