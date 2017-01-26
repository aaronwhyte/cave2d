/**
 * WebGL page baseclass
 * @param {BaseApp} app
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (Page)
 */
function ScreenPage(app, gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  if (gameTitle == null) {
    // probably making a prototype
    return;
  }
  this.app = app;
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.levelDataPath = BaseApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(BaseApp.PATH_LEVEL_JSON);

  this.canvas = null;
  this.pauseMenuDiv = null;
  this.oldMetaViewportContent = null;
  this.animateFrameFn = this.animateFrame.bind(this);
  this.paused = false;
}
ScreenPage.prototype = new Page();
ScreenPage.prototype.constructor = ScreenPage;

ScreenPage.prototype.enterDoc = function() {
  if (this.canvas || this.pauseMenuDiv) {
    throw Error('nodes should be falsey. canvas:' + this.canvas + 'pauseMenuDiv:' + this.pauseMenuDiv);
  }
  var df = document.createDocumentFragment();

  this.canvas = Dom.ce('canvas', df);
  this.canvas.id = 'canvas';

  this.pauseMenuDiv = Dom.ce('div', df);
  this.pauseMenuDiv.id = 'pauseMenu';
  document.body.appendChild(df);
  document.body.classList.add('canvasPage');

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width, user-scalable=no';

  this.refreshPauseMenu();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 2);

  // On-event sound unlocker for iOS.
  var resumeButton = document.querySelector('#resumeButton');
  var boundUnlock = this.unlockIosSound.bind(this);
  resumeButton.addEventListener('touchend', boundUnlock);
  resumeButton.addEventListener('touchstart', boundUnlock);
  this.canvas.addEventListener('touchend', boundUnlock);
  this.canvas.addEventListener('touchstart', boundUnlock);

  // prevent default on a lot of pinch and scroll events on mobile
  this.canvas.addEventListener('touchstart', Dom.pd);
  this.canvas.addEventListener('touchmove', Dom.pd);
  this.canvas.addEventListener('touchend', Dom.pd);
  window.addEventListener('scroll', Dom.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
ScreenPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

ScreenPage.prototype.exitDoc = function() {
  if (!this.canvas || !this.pauseMenuDiv) {
    throw Error('nodes should be truthy. canvas:' + this.canvas + 'pauseMenuDiv:' + this.pauseMenuDiv);
  }
  window.removeEventListener("scroll", Dom.pd);

  if (this.screen) {
    this.maybeSaveLevel();
    this.screen.setScreenListening(false);
  }
  document.body.removeChild(this.canvas);
  document.body.removeChild(this.pauseMenuDiv);
  document.body.classList.remove('canvasPage');
  this.canvas = null;
  this.pauseMenuDiv = null;
  this.animationId = 0;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};

ScreenPage.prototype.maybeSaveLevel = function() {
  throw "implement maybeSaveLevel";
};

ScreenPage.prototype.setPaused = function(paused) {
  this.paused = paused;
  if (this.screen) this.screen.setPaused(this.paused);
};

ScreenPage.prototype.refreshPauseMenu = function() {
  throw 'implement refreshPauseMenu';
};

ScreenPage.prototype.appendTitle = function(df) {
  var e = Dom.ce('div', df, 'gameTitle');
  e.innerHTML = Strings.textToHtml(this.gameTitle);
};
ScreenPage.prototype.appendFullScreenButton = function(df) {
  var e = Dom.ce('button', df, 'smallButton');
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');
};

ScreenPage.prototype.appendResumeButton = function(df, opt_text) {
  var e = Dom.ce('button', df, 'mainButton');
  e.id = 'resumeButton';
  e.innerHTML = Strings.textToHtml(opt_text || 'resume');
};

ScreenPage.prototype.setPauseMenuContent = function(df) {
  this.pauseMenuDiv.innerHTML = '';
  this.pauseMenuDiv.appendChild(df);
};

ScreenPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
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

ScreenPage.prototype.maybeCreateScreen = function() {
  throw 'implement maybeCreateScreen';
};

ScreenPage.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

ScreenPage.prototype.animateFrame = function(startTimeMs) {
  if (!this.animationId) {
    return;
  }
  if (!this.canvas) {
    console.log('animateFrame with no this.canvas');
    return;
  }

  this.screen.sampleStats();
  this.animationId = 0;
  this.renderer.resize().clear();
  this.screen.setScreenListening(true);
  this.screen.drawScreen(1, startTimeMs);
  if (stats && STAT_NAMES && STAT_NAMES.ANIMATION_MS) {
    stats.add(STAT_NAMES.ANIMATION_MS, performance.now() - startTimeMs);
  }
};

ScreenPage.prototype.requestFullScreen = function() {
  Dom.requestFullScreen();
  this.requestAnimation();
};
