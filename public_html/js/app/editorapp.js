/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {FileTree} fileTree
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function EditorApp(gameTitle, basePath, fileTree, vertexShaderPath, fragmentShaderPath) {
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.fileTree = fileTree;
  this.vertexShaderPath = vertexShaderPath;
  this.fragmentShaderPath = fragmentShaderPath;
  this.page = null;
}

EditorApp.PATH_ADVENTURES = 'adventures';
EditorApp.PATH_LEVELS = 'levels';

EditorApp.PARAM_ADVENTURE_NAME = 'adv';
EditorApp.PARAM_LEVEL_NAME = 'lev';

/**
 * Starts listening to hash-fragment queries, to navigate to the right page.
 */
EditorApp.prototype.start = function() {
  this.shaderTextLoader = new TextLoader([this.vertexShaderPath, this.fragmentShaderPath]);
  var self = this;
  // pre-load, so the resources are ready ASAP.
  this.shaderTextLoader.load(function() {
    self.maybeForwardShaderTexts();
  });

  this.hashChangeFunction = this.getHashChangeFunction();
  window.addEventListener('hashchange', this.hashChangeFunction, false);
  this.hashChangeFunction();
};

/**
 * If the shader texts are loaded, forward them to the current page.
 */
EditorApp.prototype.maybeForwardShaderTexts = function() {
  var vt = this.getVertexShaderText();
  var ft = this.getFragmentShaderText();
  if (vt && ft && this.page && this.page.onShaderTextChange) {
    this.page.onShaderTextChange(vt, ft);
  }
};

EditorApp.prototype.getVertexShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.vertexShaderPath);
};

EditorApp.prototype.getFragmentShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.fragmentShaderPath);
};

EditorApp.prototype.getHashChangeFunction = function() {
  var self = this;
  return function(e) {
    var query = Url.decodeQuery(Url.getFragment());
    var adventureName = query[EditorApp.PARAM_ADVENTURE_NAME];
    var levelName = query[EditorApp.PARAM_LEVEL_NAME];
    if (self.page) {
      self.page.exitDoc();
    }
    if (!adventureName || !self.hasAdventure(adventureName)) {
      // show the top level list of adventures
      self.page = new AdventureListPage(self.gameTitle, self.basePath, self.fileTree);
    } else if (!levelName || !self.hasLevel(adventureName, levelName)) {
      // show the adventure's list of levels
      self.page = new LevelListPage(self.gameTitle, self.basePath, self.fileTree, adventureName);
    } else {
      self.page = new LevelEditorPage(
          self.gameTitle, self.basePath, self.fileTree, adventureName, levelName,
          self.shaderTextLoader);
    }
    self.page.enterDoc();
    self.maybeForwardShaderTexts();
  };
};

EditorApp.prototype.hasAdventure = function(name) {
  return this.fileTree.hasDescendants(EditorApp.path(this.basePath, name));
};

EditorApp.prototype.hasLevel = function(adventureName, levelName) {
  return this.fileTree.hasDescendants(EditorApp.path(this.basePath, adventureName, levelName));
};

EditorApp.path = function(base, adventureName, levelName) {
  if (adventureName && levelName) {
    return base.concat([EditorApp.PATH_ADVENTURES, adventureName, EditorApp.PATH_LEVELS, levelName]);
  } else if (adventureName) {
    return base.concat([EditorApp.PATH_ADVENTURES, adventureName]);
  } else {
    return base.concat();
  }
};