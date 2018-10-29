/**
 * Editable list of adventures for a level-based game.
 * An adventure is a container for a series of levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {FileTree} fileTree
 * @param {String} adventureName If null, all adventures are exported
 * @param {String} levelName If null, all levels in adventure are exported
 * @constructor
 * @extends (Page)
 */
function ExportPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.levelName = levelName;
  this.rootNode = null;
  this.oldTitle = null;
}
ExportPage.prototype = new Page();
ExportPage.prototype.constructor = ExportPage;

ExportPage.prototype.enterDoc = function() {
  this.exitPointerLock();
  Page.prototype.enterDoc.call(this);
  if (this.rootNode) {
    throw Error('this.rootNode should be falsey, but it is ' + this.rootNode);
  }
  this.oldTitle = document.title;
  document.title = this.levelName || this.adventureName || this.gameTitle;

  this.rootNode = Dom.ce('div', document.body);
  document.body.classList.add('exportPage');
  this.showJson();
};

ExportPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  document.body.classList.remove('exportPage');
  this.rootNode = null;
  document.title = this.oldTitle;
};

ExportPage.prototype.showJson = function() {
  var df = document.createDocumentFragment();
  var e;
  e = Dom.ce('div', df);
  var path = BaseApp.path(this.basePath, this.adventureName, this.levelName);
  var names = this.fileTree.listDescendants(path);
  var json = {};
  for (var i = 0; i < names.length; i++) {
    json[JSON.stringify(names[i])] = this.fileTree.getFile(names[i]);
  }
  e.innerText = JSON.stringify(json, null, 1);
  this.rootNode.innerHTML = '';
  this.rootNode.appendChild(df);
};
