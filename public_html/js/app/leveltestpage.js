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
function LevelTestPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.levelDataPath = EditorApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(EditorApp.PATH_LEVEL_JSON);

  this.canvas = null;
  this.overlayDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
}
LevelTestPage.prototype = new Page();
LevelTestPage.prototype.constructor = LevelTestPage;

LevelTestPage.prototype.enterDoc = function() {
  if (this.canvas || this.overlayDiv) {
    throw Error('nodes should be falsey. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  var df = document.createDocumentFragment();

  this.canvas = this.ce('canvas', df);
  this.canvas.id = 'canvas';

  this.overlayDiv = this.ce('div', df);
  this.overlayDiv.id = 'pausedOverlay';
  document.body.appendChild(df);
  document.body.classList.add('levelTestPage');

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width, user-scalable=no';

  this.refreshOverlay();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // On-event sound unlocker for iOS.
  this.canvas.addEventListener('touchend', this.unlockIosSound.bind(this));
  this.canvas.addEventListener('touchstart', LevelTestPage.pd);
  this.canvas.addEventListener('touchmove', LevelTestPage.pd);
  this.canvas.addEventListener('touchend', LevelTestPage.pd);

  window.addEventListener("scroll", LevelTestPage.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

LevelTestPage.pd = function(event) {
  event.preventDefault();
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
LevelTestPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

LevelTestPage.prototype.exitDoc = function() {
  if (!this.canvas || !this.overlayDiv) {
    throw Error('nodes should be truthy. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  window.removeEventListener("scroll", LevelTestPage.pd);

  if (this.screen) {
    this.screen.setScreenListening(false);
  }
  document.body.removeChild(this.canvas);
  document.body.removeChild(this.overlayDiv);
  document.body.classList.remove('levelTestPage');
  this.canvas = null;
  this.overlayDiv = null;
  this.animationId = 0;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};

LevelTestPage.prototype.refreshOverlay = function() {
  var df = document.createDocumentFragment();
  var e;
  var menu = this.ce('div', df, 'pausedMenu');

  var nav = this.ce('div', menu, 'levelEditorNav');

  e = this.ce('div', nav);
  e = this.ce('a', e);
  var query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerText = this.adventureName;

  e = this.ce('div', nav, 'levelEditorLevelName');
  e.innerText = this.levelName;


  e = this.ce('button', menu);
  e.id = 'resumeButton';
  e.innerText = 'resume';
  this.ce('br', menu);

  e = this.ce('button', menu);
  e.id = 'fullScreenButton';
  e.innerText = 'full screen';

  this.overlayDiv.innerHTML = '';
  this.overlayDiv.appendChild(df);
};

LevelTestPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
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
  this.screen = new TestScreen(this, this.canvas, this.renderer, glyphs, stamps, this.sfx);
  if (this.jsonObj) {
    this.screen.loadWorldFromJson(this.jsonObj);
  } else {
    this.screen.createDefaultWorld();
  }

  this.requestAnimation();
};

LevelTestPage.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

LevelTestPage.prototype.animateFrame = function() {
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

LevelTestPage.prototype.requestFullScreen = function() {
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
