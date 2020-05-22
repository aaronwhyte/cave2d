/**
 * WebGL editor for a single level
 * @param {String} gameTitle
 * @constructor
 * @extends (Page)
 */
function Test41Page(gameTitle) {
  Page.call(this);
  this.gameTitle = gameTitle;

  this.canvas = null;
  this.pauseMenuDiv = null;

  this.oldMetaViewportContent = null;

  this.animateFrameFn = this.animateFrame.bind(this);
  this.iosSoundUnlocked = 0;
}
Test41Page.prototype = new Page();
Test41Page.prototype.constructor = Test41Page;

Test41Page.prototype.enterDoc = function() {
  Page.prototype.enterDoc.call(this);
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
};

/**
 * It seems that a drag won't work. There has to be a clean tap.
 * For now, I'll unlock every time there's a touchend.
 */
Test41Page.prototype.unlockIosSound = function() {
  this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
  this.iosSoundUnlocked++;
};

Test41Page.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
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

Test41Page.prototype.refreshPauseMenu = function() {
  var df = document.createDocumentFragment();
  var e;

  e = Dom.ce('div', df, 'gameTitle');
  e.innerHTML = Strings.textToHtml('test 41');

  var debug = Dom.ce('div', df, 'levelEditorDebugOptions');

  var label = Dom.ce('label', debug);
  e = Dom.ce('input', label);
  e.type = 'checkbox';
  e.defaultChecked = false;
  var self = this;
  e.addEventListener('change', function(element) {
    self.screen.shouldDrawStats = element.target.checked;
    self.requestAnimation();
  });
  e = Dom.ce('span', label);
  e.innerHTML = Strings.textToHtml(' draw stats');

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

Test41Page.prototype.onShaderTextChange = function(vertexShaderText, fragmentShaderText) {
  if (!this.canvas) {
    console.log('onShaderTextChange with no this.canvas');
    return;
  }

  var gl = getWebGlContext(this.canvas, {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  var vs = compileShader(gl, vertexShaderText, gl.VERTEX_SHADER);
  var fs = compileShader(gl, fragmentShaderText, gl.FRAGMENT_SHADER);
  var program = createProgram(gl, vs, fs);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);
  this.renderer = new Renderer(this.canvas, gl, program);

  this.screen = new Test41EditScreen(this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx);
  this.screen.initEditor();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.createDefaultWorld();

  this.requestAnimation();
};

Test41Page.prototype.requestAnimation = function() {
  if (!this.animationId) {
    this.animationId = requestAnimationFrame(this.animateFrameFn, this.canvas);
  }
};

Test41Page.prototype.animateFrame = function(startTimeMs) {
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

Test41Page.prototype.requestFullScreen = function() {
  Dom.requestFullScreen();
  this.requestAnimation();
};
