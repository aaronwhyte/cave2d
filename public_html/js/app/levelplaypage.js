/**
 * WebGL play page for a single level
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (Page)
 */
function LevelPlayPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.levelDataPath = PlayApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(PlayApp.PATH_LEVEL_JSON);

  this.canvas = null;
  this.overlayDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
}
LevelPlayPage.prototype = new Page();
LevelPlayPage.prototype.constructor = LevelPlayPage;

LevelPlayPage.prototype.enterDoc = function() {
  if (this.canvas || this.overlayDiv) {
    throw Error('nodes should be falsey. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  var df = document.createDocumentFragment();

  this.canvas = this.ce('canvas', df);
  this.canvas.id = 'canvas';

  this.overlayDiv = this.ce('div', df);
  this.overlayDiv.id = 'pausedOverlay';
  document.body.appendChild(df);
  document.body.classList.add('levelPlayPage');

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width, user-scalable=no';

  this.refreshOverlay();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // On-event sound unlocker for iOS.
  this.canvas.addEventListener('touchend', this.unlockIosSound.bind(this));
  this.canvas.addEventListener('touchstart', LevelPlayPage.pd);
  this.canvas.addEventListener('touchmove', LevelPlayPage.pd);
  this.canvas.addEventListener('touchend', LevelPlayPage.pd);

  window.addEventListener("scroll", LevelPlayPage.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

LevelPlayPage.pd = function(event) {
  event.preventDefault();
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
LevelPlayPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

LevelPlayPage.prototype.exitDoc = function() {
  if (!this.canvas || !this.overlayDiv) {
    throw Error('nodes should be truthy. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  window.removeEventListener("scroll", LevelPlayPage.pd);

  if (this.screen) {
    this.screen.setScreenListening(false);
  }
  document.body.removeChild(this.canvas);
  document.body.removeChild(this.overlayDiv);
  document.body.classList.remove('LevelPlayPage');
  this.canvas = null;
  this.overlayDiv = null;
  this.animationId = 0;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};

LevelPlayPage.prototype.setPaused = function(paused) {
  this.paused = paused;
  if (this.screen) this.screen.setPaused(this.paused);
};

LevelPlayPage.prototype.refreshOverlay = function() {
  var df = document.createDocumentFragment();
  var e;

  var table = this.ce('table', df, 'centerWrapper');
  table.style.height = '100%';
  table.style.width = '100%';
  var tr = this.ce('tr', table);
  var td = this.ce('td', tr);
  td.vAlign = 'middle';
  td.style.textAlign = 'center';
  var menu = this.ce('div', td, 'pausedMenu');
//  var menu = this.ce('div', df, 'pausedMenu');

  e = this.ce('div', menu, 'gameTitle');
  e.innerHTML = this.gameTitle;

  e = this.ce('button', menu);
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');

  this.ce('br', menu);

  e = this.ce('button', menu);
  e.id = 'resumeButton';
  e.innerHTML = Strings.textToHtml('play');


  this.overlayDiv.innerHTML = '';
  this.overlayDiv.appendChild(df);
};

LevelPlayPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
  if (!this.canvas) {
    console.log('onShaderTextChange with no this.canvas');
    return;
  }
  if (this.renderer) {
    // already did this
    console.log('renderer already exists');
    return;
  }

  var gl = getWebGlContext(this.canvas, {
    alpha: false,
    antialias: true
  });
  var vs = compileShader(gl, vertexShaderText, gl.VERTEX_SHADER);
  var fs = compileShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);
  var program = createProgram(gl, vs, fs);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);
  this.renderer = new Renderer(this.canvas, gl, program);

  this.maybeCreateScreen();
};

LevelPlayPage.prototype.maybeCreateScreen = function() {
  if (this.screen) {
    console.log('screen already exists');
    return;
  }
  if (!this.renderer) {
    console.log('no renderer');
    return;
  }
  if (!this.jsonObj) {
    console.log('no jsonObj');
    return;
  }

  var glyphMaker = new GlyphMaker(0.4, 1.2);
  var glyphs = new Glyphs(glyphMaker);
  var glyphStamps = glyphs.initStamps(this.renderer.gl);
  var stamps = {};
  for (var key in glyphStamps) {
    stamps[key] = glyphStamps[key];
  }
  this.screen = new PlayScreen(this, this.canvas, this.renderer, glyphs, stamps, this.sfx,
      this.adventureName, this.levelName);
  this.screen.loadWorldFromJson(this.jsonObj);
  this.screen.setPaused(this.paused);
  this.screen.snapCameraToPlayers();

  this.requestAnimation();
};

LevelPlayPage.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

LevelPlayPage.prototype.animateFrame = function() {
  if (!this.animationId) {
    return;
  }
  if (!this.canvas) {
    console.log('animateFrame with no this.canvas');
    return;
  }

  this.animationId = 0;
  this.renderer.resize().clear();
  this.screen.setScreenListening(true);
  this.screen.drawScreen(1);
};

LevelPlayPage.prototype.requestFullScreen = function() {
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
