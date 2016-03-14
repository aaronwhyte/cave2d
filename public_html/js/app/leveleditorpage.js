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
function LevelEditorPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;

  this.canvas = null;
  this.overlayDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
}
LevelEditorPage.prototype = new Page();
LevelEditorPage.prototype.constructor = LevelEditorPage;

LevelEditorPage.prototype.enterDoc = function() {
  if (this.canvas || this.overlayDiv) {
    throw Error('nodes should be falsey. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  var df = document.createDocumentFragment();

  this.canvas = this.ce('canvas', df);
  this.canvas.id = 'canvas';

  this.overlayDiv = this.ce('div', df);
  this.overlayDiv.id = 'pausedOverlay';
  document.body.appendChild(df);
  document.body.classList.add('levelEditorPage');

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width, user-scalable=no';

  this.refreshOverlay();

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // On-event sound unlocker for iOS.
  this.canvas.addEventListener('touchend', this.unlockIosSound.bind(this));
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
LevelEditorPage.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

LevelEditorPage.prototype.exitDoc = function() {
  if (!this.canvas || !this.overlayDiv) {
    throw Error('nodes should be truthy. canvas:' + this.canvas + 'overlayDiv:' + this.overlayDiv);
  }
  document.body.removeChild(this.canvas);
  document.body.removeChild(this.overlayDiv);
  document.body.classList.remove('levelEditorPage');
  this.canvas = null;
  this.overlayDiv = null;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};

LevelEditorPage.prototype.refreshOverlay = function() {
  var df = document.createDocumentFragment();
  var e;
  var menu = this.ce('div', df, 'pausedMenu');

  e = this.ce('h1', menu);
  e.innerText = 'paused';

  e = this.ce('div', menu);
  e = this.ce('a', e);
  e.href = '#';
  e.innerText = this.gameTitle;

  e = this.ce('div', menu);
  e = this.ce('a', e);
  var query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerText = this.adventureName;

  e = this.ce('div', menu);
  e.innerText = this.levelName;

  e = this.ce('button', menu);
  e.id = 'resumeButton';
  e.innerText = 'resume';
  this.ce('br', menu);

  e = this.ce('button', menu);
  e.id = 'fullScreenButton';
  e.innerText = 'full screen';
  this.ce('br', menu);

  this.ce('hr', menu);

  e = this.ce('a', menu);
  e.id = 'sharableUrl';
  e.href = '#';
  e.innerText = 'sharable URL';

  this.overlayDiv.innerHTML = '';
  this.overlayDiv.appendChild(df);
};

LevelEditorPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
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

  this.screen = new PlayScreen(this, this.canvas, this.renderer, glyphs, stamps, this.sfx);

  this.animationRequested = false;
  this.requestAnimation();
};

LevelEditorPage.prototype.requestAnimation = function() {
  if (!this.animationRequested) {
    this.animationRequested = true;
    requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

LevelEditorPage.prototype.animateFrame = function() {
  this.animationRequested = false;
  this.renderer.resize().clear();
  this.screen.setScreenListening(true);
  this.screen.drawScreen(1);
};

