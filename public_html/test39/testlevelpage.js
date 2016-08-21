/**
 * WebGL editor for a single level
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (Page)
 */
function TestLevelPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.levelDataPath = EditorApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(EditorApp.PATH_LEVEL_JSON);

  this.canvas = null;
  this.pauseMenuDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
}
TestLevelPage.prototype = new Page();
TestLevelPage.prototype.constructor = TestLevelPage;

TestLevelPage.prototype.enterDoc = function() {
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
  this.sfx.setListenerXYZ(0, 0, 4);

  // On-event sound unlocker for iOS.
  var resumeButton = document.querySelector('#resumeButton');
  var boundUnlock = this.unlockIosSound.bind(this);
  resumeButton.addEventListener('touchend', boundUnlock);
  resumeButton.addEventListener('touchstart', boundUnlock);
  this.canvas.addEventListener('touchend', boundUnlock);
  this.canvas.addEventListener('touchstart', boundUnlock);

  this.canvas.addEventListener('touchstart', Dom.pd);
  this.canvas.addEventListener('touchmove', Dom.pd);
  this.canvas.addEventListener('touchend', Dom.pd);

  window.addEventListener("scroll", Dom.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
TestLevelPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

TestLevelPage.prototype.exitDoc = function() {
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

TestLevelPage.prototype.refreshPauseMenu = function() {
  var df = document.createDocumentFragment();
  var e;

  var nav = Dom.ce('div', df, 'levelEditorNav');

  e = Dom.ce('div', nav);
  e = Dom.ce('a', e);
  var query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerHTML = Strings.textToHtml(this.adventureName);

  e = Dom.ce('div', nav, 'levelEditorLevelName');
  e.innerHTML = Strings.textToHtml(this.levelName);

  var debug = Dom.ce('div', df, 'levelEditorDebugOptions');
  var label = Dom.ce('label', debug);
  e = Dom.ce('input', label);
  e.type = 'checkbox';
  e.defaultChecked = false;
  var self = this;
  e.addEventListener('change', function(element) {
    self.screen.drawScans = element.target.checked;
  });
  e = Dom.ce('span', label);
  e.innerHTML = Strings.textToHtml(' draw rayscans');

  e = Dom.ce('button', df, 'smallButton');
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');

  Dom.ce('br', df);

  e = Dom.ce('button', df, 'mainButton');
  e.id = 'resumeButton';
  e.innerHTML = Strings.textToHtml('resume');

  this.pauseMenuDiv.innerHTML = '';
  this.pauseMenuDiv.appendChild(df);
};

TestLevelPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
  if (!this.canvas) {
    console.log('onShaderTextChange with no this.canvas');
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

  var glyphMaker = new GlyphMaker(0.4, 1.2);
  var glyphs = new Glyphs(glyphMaker);
  var glyphStamps = glyphs.initStamps(this.renderer.gl);
  var stamps = {};
  for (var key in glyphStamps) {
    stamps[key] = glyphStamps[key];
  }

  // TODO: creating a Screen here is nasty.
  this.screen = new TestScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx,
      this.adventureName, this.levelName);
  this.screen.initWidgets();
  this.screen.initSpiritConfigs();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  if (this.jsonObj) {
    this.screen.loadWorldFromJson(this.jsonObj);
  } else {
    this.screen.createDefaultWorld();
  }

  this.requestAnimation();
};

TestLevelPage.prototype.requestAnimation = function() {
  if (!this.animationId && this.canvas) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

TestLevelPage.prototype.animateFrame = function() {
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

TestLevelPage.prototype.requestFullScreen = function() {
  Dom.requestFullScreen();
  this.requestAnimation();
};
