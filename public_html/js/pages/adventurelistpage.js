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
  this.refreshList();
};

AdventureListPage.prototype.exitDoc = function() {
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  this.rootNode = null;
};

AdventureListPage.prototype.refreshList = function() {
  var df = document.createDocumentFragment();
  var e;
  e = this.ce('h1', df);
  e.innerText = this.gameTitle;

  e = this.ce('button', df, 'createButton');
  e.onclick = this.createCreateFunction();
  e.innerText = 'create';

  var names = this.fileTree.listChildren(this.basePath);
  var rows = this.ce('div', df, 'rows');
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var row = this.ce('div', rows, 'row');

    e = this.ce('a', row);
    e.innerText = name;

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

AdventureListPage.prototype.createCreateFunction = function() {
  var self = this;
  return function() {
    // TODO prompt for name
    var now = new Date();
    var newName = Strings.formatTimeString(now);
    self.touch(newName);
    self.refreshList();
  }
};

AdventureListPage.prototype.createDeleteFunction = function (name) {
  var self = this;
  return function() {
    self.fileTree.deleteDescendants(self.basePath.concat([name]));
    self.refreshList();
  };
};

AdventureListPage.prototype.createRenameFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.moveDescendants(self.basePath.concat([name]), self.basePath.concat([newName]));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.createCopyFunction = function(name) {
  var self = this;
  return function() {
    var newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.copyDescendants(self.basePath.concat([name]), self.basePath.concat([newName]));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.touch = function(name) {
  this.fileTree.setFile(
      this.basePath.concat([name, AdventureListPage.TOUCHDATE]),
      Date.now());
};
