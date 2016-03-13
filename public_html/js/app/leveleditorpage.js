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

  this.canvasNode = null;
  this.overlayNode = null;
}
LevelEditorPage.prototype = new Page();
LevelEditorPage.prototype.constructor = LevelEditorPage;

LevelEditorPage.prototype.enterDoc = function() {
  if (this.canvasNode || this.overlayNode) {
    throw Error('nodes should be falsey. canvas:' + this.canvasNode + ' overlay:' + this.overlayNode);
  }
  var df = document.createDocumentFragment();

  this.canvasNode = this.ce('canvas', df);
  this.canvasNode.id = 'canvas';

  this.overlayNode = this.ce('div', df);
  this.overlayNode.id = 'pausedOverlay';
  document.body.appendChild(df);
  document.body.classList.add('levelEditorPage');
  this.refreshOverlay();
};

LevelEditorPage.prototype.exitDoc = function() {
  if (!this.canvasNode || !this.overlayNode) {
    throw Error('nodes should be truthy. canvas:' + this.canvasNode + ' overlay:' + this.overlayNode);
  }
  document.body.removeChild(this.canvasNode);
  document.body.removeChild(this.overlayNode);
  document.body.classList.remove('levelEditorPage');
  this.canvasNode = null;
  this.overlayNode = null;
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

  e = this.ce('button', menu);
  e.id = 'fullScreenButton';
  e.innerText = 'full screen';

  this.ce('hr', menu);

  e = this.ce('a', menu);
  e.id = 'sharableUrl';
  e.href = '#';
  e.innerText = 'sharable URL';

  this.overlayNode.innerHTML = '';
  this.overlayNode.appendChild(df);
};
