/**
 * WebGL page baseclass
 * @param {BaseApp} app
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @param {*} startingGameState  Whatever state the game wants to preserve when changing levels.
 *      Child classes might use it.
 * @constructor
 * @extends (Page)
 */
function ScreenPage(app, gameTitle, basePath, fileTree, adventureName, levelName, startingGameState) {
  Page.call(this);
  if (!gameTitle) {
    // probably making a prototype
    return;
  }
  this.app = app;
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.startingGameState = startingGameState;
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
  Page.prototype.enterDoc.call(this);
  if (this.canvas || this.pauseMenuDiv) {
    throw Error('nodes should be falsey. canvas:' + this.canvas + 'pauseMenuDiv:' + this.pauseMenuDiv);
  }
  let df = document.createDocumentFragment();

  this.canvas = Dom.ce('canvas', df);
  this.canvas.id = 'canvas';

  this.pauseMenuDiv = Dom.ce('div', df);
  this.pauseMenuDiv.id = 'pauseMenu';
  document.body.appendChild(df);
  document.body.classList.add('canvasPage');

  let metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width, user-scalable=no';

  this.refreshPauseMenu();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 2);

  // On-event sound unlocker.
  let resumeButton = document.querySelector('#resumeButton');
  let soundUnlock = this.unlockSound.bind(this);
  resumeButton.addEventListener('touchend', soundUnlock);
  resumeButton.addEventListener('touchstart', soundUnlock);
  this.canvas.addEventListener('touchend', soundUnlock);
  this.canvas.addEventListener('touchstart', soundUnlock);
  // for Chrome 2018-05 era
  this.canvas.addEventListener('keydown', soundUnlock);
  this.canvas.addEventListener('mousedown', soundUnlock);

  // prevent default on a lot of pinch and scroll events on mobile
  this.canvas.addEventListener('touchstart', Dom.pd);
  this.canvas.addEventListener('touchmove', Dom.pd);
  this.canvas.addEventListener('touchend', Dom.pd);
  window.addEventListener('scroll', Dom.pd);

  // prevent right-click context menu
  this.canvas.addEventListener('contextmenu', Dom.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

/**
 * Starts a one-hour super-quiet sound, which prevents iOS wrecking you next audio attempt
 * if you don't touch anything for a couple seconds.
 */
ScreenPage.prototype.unlockSound = function() {
  // clear the old one
  if (this.iosOscillator) {
    this.iosOscillator.stop();
  }
  this.iosOscillator = this.sfx.sound(0, 0, 0, 0.001, 1,
      60 * 60, // one hour
      1, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

ScreenPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
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

  let metaViewport = document.head.querySelector('meta[name="viewport"]');
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
  let e = Dom.ce('div', df, 'gameTitle');
  e.innerHTML = Strings.textToHtml(this.gameTitle);
};

ScreenPage.prototype.appendFullScreenButton = function(df) {
  let e = Dom.ce('button', df, 'smallButton');
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');
};

ScreenPage.prototype.appendResumeButton = function(df, opt_text) {
  let e = Dom.ce('button', df, 'mainButton');
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

  let gl = getWebGlContext(this.canvas, {
    alpha: false,
    antialias: true
  });
  let vs = compileShader(gl, vertexShaderText, gl.VERTEX_SHADER);
  let fs = compileShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);
  let program = createProgram(gl, vs, fs);
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

  this.animationId = 0;
  this.renderer.resize().clear();
  this.screen.setScreenListening(true);
  this.screen.drawScreen(1, startTimeMs);
};

ScreenPage.prototype.requestFullScreen = function() {
  Dom.requestFullScreen();
  this.requestAnimation();
};
