/**
 * Editable list of levels in a single adventure.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @constructor
 * @extends (Page)
 */
function LevelListPage(gameTitle, basePath, fileTree, adventureName) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.adventureName = adventureName;
  this.rootNode = null;
}
LevelListPage.prototype = new Page();
LevelListPage.prototype.constructor = LevelListPage;

LevelListPage.TOUCHDATE = 'TOUCHDATE';

LevelListPage.prototype.enterDoc = function() {
  if (this.rootNode) {
    throw Error('this.rootNode should be falsey, but it is ' + this.rootNode);
  }
  this.rootNode = this.ce('div', document.body);
  document.body.classList.add('listPage');
  this.refreshList();
};

LevelListPage.prototype.exitDoc = function() {
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  document.body.classList.remove('listPage');
  this.rootNode = null;
};

LevelListPage.prototype.refreshList = function() {
  var df = document.createDocumentFragment();
  var e;

  var title = this.ce('header', df);
  e = this.ce('a', title);
  e.href = '#';
  e.innerText = this.gameTitle;

  this.ce('p', df);

  var colHead = this.ce('header', df, 'columnHeader');
  e = this.ce('span', colHead);
  e.innerText = this.adventureName;
  e = this.ce('span', colHead, 'separator');
  e.innerHTML = ' : ';
  e = this.ce('span', colHead);
  e.innerText = 'Levels';

  e = this.ce('button', df, 'createButton');
  e.onclick = this.createCreateFunction();
  e.innerText = 'create';

  var names = this.fileTree.listChildren(
      EditorApp.path(this.basePath, this.adventureName).concat(EditorApp.PATH_LEVELS));
  var rows = this.ce('div', df, 'rows');
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var row = this.ce('div', rows, 'row');

    e = this.ce('a', row);
    e.innerText = name;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = name;
    e.href = '#' + Url.encodeQuery(query);

    var buttons = this.ce('div', row, 'rightButtonCluster');

    e = this.ce('button', buttons);
    e.innerText = 'copy';
    e.onclick = this.createCopyFunction(name);

    e = this.ce('button', buttons);
    e.innerText = 'rename';
    e.onclick = this.createRenameFunction(name);

    e = this.ce('button', buttons);
    e.innerText = 'delete';
    e.onclick = this.createDeleteFunction(name);
  }

  this.rootNode.innerHTML = '';
  this.rootNode.appendChild(df);
};

LevelListPage.prototype.createCreateFunction = function() {
  var self = this;
  return function() {
    // TODO prompt for name
    var now = new Date();
    var newName = Strings.formatTimeString(now);
    self.touch(newName);
    self.refreshList();
  }
};

LevelListPage.prototype.createDeleteFunction = function(name) {
  var self = this;
  return function() {
    self.fileTree.deleteDescendants(EditorApp.path(self.basePath, self.adventureName, name));
    self.refreshList();
  };
};

LevelListPage.prototype.createRenameFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.moveDescendants(
          EditorApp.path(self.basePath, self.adventureName, name),
          EditorApp.path(self.basePath, self.adventureName, newName));
      self.refreshList();
    }
  };
};

LevelListPage.prototype.createCopyFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.copyDescendants(
          EditorApp.path(self.basePath, self.adventureName, name),
          EditorApp.path(self.basePath, self.adventureName, newName));
      self.refreshList();
    }
  };
};

LevelListPage.prototype.touch = function(name) {
  this.fileTree.setFile(
      EditorApp.path(this.basePath, this.adventureName, name).concat([LevelListPage.TOUCHDATE]),
      Date.now());
};
