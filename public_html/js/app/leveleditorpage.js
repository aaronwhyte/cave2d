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
  this.levelDataPath = EditorApp.path(this.basePath, this.adventureName, this.levelName)
      .concat(EditorApp.PATH_LEVEL_JSON);

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
  this.canvas.addEventListener('touchstart', LevelEditorPage.pd);
  this.canvas.addEventListener('touchmove', LevelEditorPage.pd);
  this.canvas.addEventListener('touchend', LevelEditorPage.pd);

  window.addEventListener("scroll", LevelEditorPage.pd);

  // load level
  this.jsonObj = this.fileTree.getFile(this.levelDataPath);
};

LevelEditorPage.pd = function(event) {
  event.preventDefault();
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
  window.removeEventListener("scroll", LevelEditorPage.pd);

  if (this.screen) {
    this.saveLevel();
    this.screen.setScreenListening(false);
  }
  document.body.removeChild(this.canvas);
  document.body.removeChild(this.overlayDiv);
  document.body.classList.remove('levelEditorPage');
  this.canvas = null;
  this.overlayDiv = null;
  this.animationId = 0;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};

LevelEditorPage.prototype.saveLevel = function() {
  if (!this.screen) {
    console.warn('No screen, cannot get JSON to save level: ' + this.levelName);
    return;
  }
  this.jsonObj = this.screen.toJSON();
  this.fileTree.setFile(this.levelDataPath, this.jsonObj);
};

LevelEditorPage.prototype.refreshOverlay = function() {
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

  var nav = this.ce('div', menu, 'levelEditorNav');

  e = this.ce('div', nav);
  e = this.ce('a', e);
  var query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerHTML = Strings.textToHtml(this.adventureName);

  e = this.ce('div', nav, 'levelEditorLevelName');
  e.innerHTML = Strings.textToHtml(this.levelName);

  e = this.ce('button', menu);
  e.id = 'fullScreenButton';
  e.innerHTML = Strings.textToHtml('full screen');

  this.ce('br', menu);

  e = this.ce('button', menu);
  e.id = 'resumeButton';
  e.innerHTML = Strings.textToHtml('resume');

  this.overlayDiv.innerHTML = '';
  this.overlayDiv.appendChild(df);
};

LevelEditorPage.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
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
  this.screen = new EditScreen(this, this.canvas, this.renderer, glyphs, stamps, this.sfx,
      this.adventureName, this.levelName);
  if (this.jsonObj) {
    this.screen.loadWorldFromJson(this.jsonObj);
  } else {
    this.screen.createDefaultWorld();
  }

  this.requestAnimation();
};

LevelEditorPage.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

LevelEditorPage.prototype.animateFrame = function() {
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

LevelEditorPage.prototype.requestFullScreen = function() {
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
