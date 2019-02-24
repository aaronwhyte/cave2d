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
  Page.prototype.enterDoc.call(this);
  this.exitPointerLock();
  if (this.rootNode) {
    throw Error('this.rootNode should be falsey, but it is ' + this.rootNode);
  }
  this.rootNode = Dom.ce('div', document.body);
  document.body.classList.add('listPage');
  this.refreshList();
};

AdventureListPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  document.body.classList.remove('listPage');
  this.rootNode = null;
};

AdventureListPage.prototype.refreshList = function() {
  let df = document.createDocumentFragment();
  let e;
  e = Dom.ce('header', df);
  e.innerHTML = Strings.textToHtml(this.gameTitle);

  Dom.ce('p', df);

  e = Dom.ce('header', df, 'columnHeader');
  e.innerHTML = Strings.textToHtml('Adventures');

  e = Dom.ce('button', df, 'createButton');
  e.onclick = this.createCreateFunction();
  e.innerHTML = Strings.textToHtml('create');

  let names = this.fileTree.listChildren(BaseApp.path(this.basePath).concat(BaseApp.PATH_ADVENTURES));
  let rows = Dom.ce('div', df, 'rows');
  let query;
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let row = Dom.ce('div', rows, 'row');

    e = Dom.ce('a', row);
    e.innerHTML = Strings.textToHtml(name);
    query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = name;
    e.href = '#' + Url.encodeQuery(query);

    let buttons = Dom.ce('div', row, 'rightButtonCluster');

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('copy');
    e.onclick = this.createCopyFunction(name);

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('rename');
    e.onclick = this.createRenameFunction(name);

    e = Dom.ce('a', buttons);
    e.innerHTML = Strings.textToHtml('export');
    query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = name;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EXPORT;
    e.href = '#' + Url.encodeQuery(query);

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('delete');
    e.onclick = this.createDeleteFunction(name);
  }

  this.rootNode.innerHTML = '';
  this.rootNode.appendChild(df);
};

AdventureListPage.prototype.createCreateFunction = function() {
  let self = this;
  return function() {
    let newName = prompt('New adventure name?');
    if (newName) {
      self.touch(newName);
      self.refreshList();
    }
  }
};

AdventureListPage.prototype.createDeleteFunction = function(name) {
  let self = this;
  return function() {
    if (confirm('Delete adventure ' + name + '\nAre you sure?')) {
      self.fileTree.moveDescendants(
          BaseApp.path(self.basePath, name),
          EditorApp.trashPath(self.basePath, new Date(), name));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.createRenameFunction = function(name) {
  let self = this;
  return function() {
    let newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.moveDescendants(
          BaseApp.path(self.basePath, name),
          BaseApp.path(self.basePath, newName));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.createCopyFunction = function(name) {
  let self = this;
  return function() {
    let newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.copyDescendants(
          BaseApp.path(self.basePath, name),
          BaseApp.path(self.basePath, newName));
      self.refreshList();
    }
  };
};

AdventureListPage.prototype.touch = function(name) {
  this.fileTree.setFile(
      BaseApp.path(this.basePath, name).concat([AdventureListPage.TOUCHDATE]),
      Date.now());
};
