/**
 * WebGL play page for a single level
 * @param {PlayApp} app
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (Page)
 */
function PlayLevelPage(app, gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.app = app;
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.levelDataPath = PlayApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(PlayApp.PATH_LEVEL_JSON);

  this.canvas = null;
  this.pauseMenuDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
}
PlayLevelPage.prototype = new Page();
PlayLevelPage.prototype.constructor = PlayLevelPage;

PlayLevelPage.prototype.enterDoc = function() {
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

  this.refreshOverlay();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 4);

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
PlayLevelPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

PlayLevelPage.prototype.exitDoc = function() {
  if (!this.canvas || !this.pauseMenuDiv) {
    throw Error('nodes should be truthy. canvas:' + this.canvas + 'pauseMenuDiv:' + this.pauseMenuDiv);
  }
  window.removeEventListener("scroll", Dom.pd);

  if (this.screen) {
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

PlayLevelPage.prototype.setPaused = function(paused) {
  this.paused = paused;
  if (this.screen) this.screen.setPaused(this.paused);
};

PlayLevelPage.prototype.refreshOverlay = function() {
  var df = document.createDocumentFragment();
  var e;

  e = Dom.ce('div', df, 'gameTitle');
  e.innerHTML = this.gameTitle;

  e = Dom.ce('button', df, 'smallButton');
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');

  Dom.ce('br', df);

  e = Dom.ce('button', df, 'smallButton');
  e.id = 'restartButton';
  e.innerHTML = Strings.textToHtml('restart level');

  Dom.ce('br', df);

  e = Dom.ce('button', df, 'mainButton');
  e.id = 'resumeButton';
  e.innerHTML = Strings.textToHtml('play');


  this.pauseMenuDiv.innerHTML = '';
  this.pauseMenuDiv.appendChild(df);
};

PlayLevelPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
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

PlayLevelPage.prototype.maybeCreateScreen = function() {
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

  this.screen = new Game2PlayScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx, this.adventureName, this.levelName);
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.jsonObj);
  this.screen.setPaused(this.paused);
  this.screen.snapCameraToPlayers();

  this.requestAnimation();
};

PlayLevelPage.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

PlayLevelPage.prototype.animateFrame = function(startTimeMs) {
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

PlayLevelPage.prototype.requestFullScreen = function() {
  Dom.requestFullScreen();
  this.requestAnimation();
};

PlayLevelPage.prototype.exitLevel = function() {
  this.screen.destroyScreen();
  this.screen = null;
  this.app.exitLevel(this.adventureName, this.levelName);
};

PlayLevelPage.prototype.restartLevel = function() {
  this.screen.destroyScreen();
  this.screen = null;
  this.app.restartLevel();
};