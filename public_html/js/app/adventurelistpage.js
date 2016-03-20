/**
 * Editable list of adventures for a level-based game.
 * An adventure is a container for a series of levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {FileTree} fileTree
 * @constructor
 * @extends (Page)
 */
function AdventureListPage(gameTitle, basePath, fileTree) {
  Page.call(this);
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.rootNode = null;
}
AdventureListPage.prototype = new Page();
AdventureListPage.prototype.constructor = AdventureListPage;

AdventureListPage.TOUCHDATE = 'TOUCHDATE';

AdventureListPage.prototype.enterDoc = function() {
  if (this.rootNode) {
    throw Error('this.rootNode should be falsey, but it is ' + this.rootNode);
  }
  this.rootNode = this.ce('div', document.body);
  document.body.classList.add('listPage');
  this.refreshList();
};

AdventureListPage.prototype.exitDoc = function() {
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  document.body.classList.remove('listPage');
  this.rootNode = null;
};

AdventureListPage.prototype.refreshList = function() {
  var df = document.createDocumentFragment();
  var e;
  e = this.ce('header', df);
  e.innerText = this.gameTitle;

  this.ce('p', df);

  e = this.ce('header', df, 'columnHeader');
  e.innerText = 'Adventures';

  e = this.ce('button', df, 'createButton');
  e.onclick = this.createCreateFunction();
  e.innerText = 'create';

  var names = this.fileTree.listChildren(EditorApp.path(this.basePath).concat(EditorApp.PATH_ADVENTURES));
  var rows = this.ce('div', df, 'rows');
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var row = this.ce('div', rows, 'row');

    e = this.ce('a', row);
    e.innerText = name;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = name;
    e.href = '#' + Url.encodeQuery(query);

    var buttons = this.ce('div', row, 'rightButtonCluster');

    e = this.ce('button', buttons);
    e.innerText = 'copy';
    e.onclick = this.createCopyFunction(name);

    e = this.ce('button', buttons);
    e.innerText = 'rename';
    e.onclick = this.createRenameFunction(name);

    e = this.ce('a', buttons);
    e.innerText = 'export';query = {};
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = name;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EXPORT;
    e.href = '#' + Url.encodeQuery(query);

    e = this.ce('button', buttons);
    e.innerText = 'delete';
    e.onclick = this.createDeleteFunction(name);
  }

  this.rootNode.innerHTML = '';
  this.rootNode.appendChild(df);
};

AdventureListPage.prototype.createCreateFunction = function() {
  var self = this;
  return function() {
    var newName = prompt('New adventure name?');
    if (newName) {
      self.touch(newName);
      self.refreshList();
    }
  }
};

AdventureListPage.prototype.createDeleteFunction = function(name) {
  var self = this;
  return function() {
    if (confirm('Delete adventure ' + name + '\nAre you sure?')) {
      self.fileTree.moveDescendants(
          EditorApp.path(self.basePath, name),
          EditorApp.trashPath(self.basePath, new Date(), name));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.createRenameFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.moveDescendants(
          EditorApp.path(self.basePath, name),
          EditorApp.path(self.basePath, newName));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.createCopyFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.copyDescendants(
          EditorApp.path(self.basePath, name),
          EditorApp.path(self.basePath, newName));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.touch = function(name) {
  this.fileTree.setFile(
      EditorApp.path(this.basePath, name).concat([AdventureListPage.TOUCHDATE]),
      Date.now());
};
