/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @param {FileTree} fileTree
 * @param {function} editLevelPageCtor
 * @param {function} testLevelPageCtor
 * @extends {BaseApp}
 * @constructor
 */
function EditorApp(gameTitle, basePath, vertexShaderPath, fragmentShaderPath,
                   fileTree, editLevelPageCtor, testLevelPageCtor) {
  BaseApp.call(this, gameTitle, basePath, vertexShaderPath, fragmentShaderPath);
  this.fileTree = fileTree;
  this.editLevelPageCtor = editLevelPageCtor;
  this.testLevelPageCtor = testLevelPageCtor;
}
EditorApp.prototype = new BaseApp();
EditorApp.prototype.constructor = EditorApp;

EditorApp.PATH_TRASH = 'trash';

EditorApp.PARAM_MODE = 'mode';
EditorApp.PARAM_ADVENTURE_NAME = 'adv';
EditorApp.PARAM_LEVEL_NAME = 'lev';

EditorApp.MODE_EDIT = 'edit';
EditorApp.MODE_EXPORT = 'export';
EditorApp.MODE_TEST = 'test';

/**
 * Starts listening to hash-fragment queries, to navigate to the right page.
 * @override
 */
EditorApp.prototype.start = function() {
  this.startLoadingShaders();

  // editor stuff
  this.beforeUnloadFunction = this.getBeforeUnloadFunction();
  window.addEventListener('beforeunload', this.beforeUnloadFunction, false);

  this.hashChangeFunction = this.getHashChangeFunction();
  window.addEventListener('hashchange', this.hashChangeFunction, false);
  this.hashChangeFunction();
};

EditorApp.prototype.getFileTree = function() {
  return this.fileTree;
};

EditorApp.prototype.getHashChangeFunction = function() {
  var self = this;
  return function(e) {
    var query = Url.decodeQuery(Url.getFragment());
    var mode = query[EditorApp.PARAM_MODE];
    var adventureName = query[EditorApp.PARAM_ADVENTURE_NAME];
    var levelName = query[EditorApp.PARAM_LEVEL_NAME];
    if (self.page) {
      self.page.exitDoc();
    }
    if (mode == EditorApp.MODE_EXPORT) {
      self.page = new ExportPage(self.gameTitle, self.basePath, self.fileTree, adventureName, levelName);
    } else {
      //'edit mode' is default
      if (!adventureName || !self.hasAdventure(adventureName)) {
        // show the top level list of adventures
        self.page = new AdventureListPage(self.gameTitle, self.basePath, self.fileTree);
      } else if (!levelName || !self.hasLevel(adventureName, levelName)) {
        // show the adventure's list of levels
        self.page = new LevelListPage(self.gameTitle, self.basePath, self.fileTree, adventureName);
      } else {
        // we have an adventure and a level
        if (mode == EditorApp.MODE_TEST) {
          self.page = new self.testLevelPageCtor(
              self.gameTitle, self.basePath, self.fileTree, adventureName, levelName,
              self.shaderTextLoader);
        } else {
          // MODE_EDIT is the default
          self.page = new self.editLevelPageCtor(
              self.gameTitle, self.basePath, self.fileTree, adventureName, levelName,
              self.shaderTextLoader);
        }
      }
    }
    self.page.enterDoc();
    self.maybeForwardShaderTexts();
  };
};

EditorApp.trashPath = function(base, date, adventureName, levelName) {
  var dateStr = Strings.formatTimeString(date);
  if (adventureName && levelName) {
    return base.concat(
        [EditorApp.PATH_TRASH, dateStr, BaseApp.PATH_ADVENTURES, adventureName, BaseApp.PATH_LEVELS, levelName]);
  } else if (adventureName) {
    return base.concat([EditorApp.PATH_TRASH, dateStr, BaseApp.PATH_ADVENTURES, adventureName]);
  } else {
    return base.concat([EditorApp.PATH_TRASH, dateStr]);
  }
};