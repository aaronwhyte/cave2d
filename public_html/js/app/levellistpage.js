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
  this.exitPointerLock();
  Page.prototype.enterDoc.call(this);
  if (this.rootNode) {
    throw Error('this.rootNode should be falsey, but it is ' + this.rootNode);
  }
  this.rootNode = Dom.ce('div', document.body);
  document.body.classList.add('listPage');
  this.refreshList();
};

LevelListPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
  if (!this.rootNode) {
    throw Error('this.rootNode should be truthy, but it is ' + this.rootNode);
  }
  document.body.removeChild(this.rootNode);
  document.body.classList.remove('listPage');
  this.rootNode = null;
};

LevelListPage.prototype.refreshList = function() {
  let df = document.createDocumentFragment();
  let e;

  let title = Dom.ce('header', df);
  e = Dom.ce('a', title);
  e.href = '#';
  e.innerHTML = Strings.textToHtml(this.gameTitle);

  Dom.ce('p', df);

  let colHead = Dom.ce('header', df, 'columnHeader');
  e = Dom.ce('span', colHead);
  e.innerHTML = Strings.textToHtml(this.adventureName);
  e = Dom.ce('span', colHead, 'separator');
  e.innerHTML = Strings.textToHtml(' : ');
  e = Dom.ce('span', colHead);
  e.innerHTML = Strings.textToHtml('Levels');

  e = Dom.ce('button', df, 'createButton');
  e.onclick = this.createCreateFunction();
  e.innerHTML = Strings.textToHtml('create');

  let names = this.fileTree.listChildren(
      BaseApp.path(this.basePath, this.adventureName).concat(BaseApp.PATH_LEVELS));
  let rows = Dom.ce('div', df, 'rows');
  for (let i = 0; i < names.length; i++) {
    let name = names[i];
    let row = Dom.ce('div', rows, 'row');

    e = Dom.ce('a', row);
    e.innerHTML = Strings.textToHtml(name);
    let query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = name;
    e.href = '#' + Url.encodeQuery(query);

    let buttons = Dom.ce('div', row, 'rightButtonCluster');

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('copy');
    e.onclick = this.createCopyFunction(name);

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('rename');
    e.onclick = this.createRenameFunction(name);

    e = Dom.ce('button', buttons);
    e.innerHTML = Strings.textToHtml('delete');
    e.onclick = this.createDeleteFunction(name);
  }

  this.rootNode.innerHTML = '';
  this.rootNode.appendChild(df);
};

LevelListPage.prototype.createCreateFunction = function() {
  let self = this;
  return function() {
    let newName = prompt('New level name?');
    if (newName) {
      self.touch(newName);
      self.refreshList();
    }
  }
};

LevelListPage.prototype.createDeleteFunction = function(name) {
  let self = this;
  return function() {
    if (confirm('Delete level ' + name + '\nAre you sure?')) {
      self.fileTree.moveDescendants(
          BaseApp.path(self.basePath, self.adventureName, name),
          EditorApp.trashPath(self.basePath, new Date(), self.adventureName, name));
      self.refreshList();
    }
  };
};

LevelListPage.prototype.createRenameFunction = function(name) {
  let self = this;
  return function() {
    let newName = prompt('Rename ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.moveDescendants(
          BaseApp.path(self.basePath, self.adventureName, name),
          BaseApp.path(self.basePath, self.adventureName, newName));
      self.refreshList();
    }
  };
};

LevelListPage.prototype.createCopyFunction = function(name) {
  let self = this;
  return function() {
    let newName = prompt('Copy ' + name + '\nNew name?');
    if (newName) {
      self.fileTree.copyDescendants(
          BaseApp.path(self.basePath, self.adventureName, name),
          BaseApp.path(self.basePath, self.adventureName, newName));
      self.refreshList();
    }
  };
};

LevelListPage.prototype.touch = function(name) {
  this.fileTree.setFile(
      BaseApp.path(this.basePath, this.adventureName, name).concat([LevelListPage.TOUCHDATE]),
      Date.now());
};
