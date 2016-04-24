/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {String} dataFilePath
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function PlayApp(gameTitle, basePath, dataFilePath, vertexShaderPath, fragmentShaderPath) {
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.dataFilePath = dataFilePath;
  this.vertexShaderPath = vertexShaderPath;
  this.fragmentShaderPath = fragmentShaderPath;
  this.page = null;
}

PlayApp.PATH_ADVENTURES = 'adventures';
PlayApp.PATH_LEVELS = 'levels';
PlayApp.PATH_LEVEL_JSON = 'leveljson';

PlayApp.prototype.start = function() {
  var self = this;

  this.dataFileLoader = new TextLoader([this.dataFilePath]);
  this.dataFileLoader.load(function() {
    self.onDataFileLoaded();
  });

  this.shaderTextLoader = new TextLoader([this.vertexShaderPath, this.fragmentShaderPath]);
  this.shaderTextLoader.load(function() {
    self.maybeForwardShaderTexts();
  });
};

/**
 * If both shader texts are loaded and the page exists, forward shader texts to the page.
 */
PlayApp.prototype.maybeForwardShaderTexts = function() {
  var vt = this.getVertexShaderText();
  var ft = this.getFragmentShaderText();
  if (vt && ft && this.page && this.page.onShaderTextChange) {
    this.page.onShaderTextChange(vt, ft);
  }
};

PlayApp.prototype.onDataFileLoaded = function() {
  var jsonText = this.dataFileLoader.getTextByPath(this.dataFilePath);
  var jsonObj = JSON.parse(jsonText);
  this.fileTree = new FileTree(new JsonStorage(jsonObj));

  // Start on the first (only) adventure's first (zeroeth) level.
  var adventureNames = this.fileTree.listChildren(PlayApp.path(this.basePath).concat(PlayApp.PATH_ADVENTURES));
  this.adventureName = adventureNames[0];
  var levelNames = this.fileTree.listChildren(PlayApp.path(this.basePath, this.adventureName).concat(PlayApp.PATH_LEVELS));
  this.levelName = levelNames.sort()[0];
  this.page = new LevelPlayPage(this, this.gameTitle, this.basePath, this.fileTree, this.adventureName, this.levelName);
  this.page.enterDoc();
  this.page.setPaused(true);
  this.maybeForwardShaderTexts();
};

PlayApp.prototype.exitLevel = function(fromAdventureName, fromLevelName) {
  var levelNames = this.fileTree.listChildren(PlayApp.path(this.basePath, fromAdventureName).concat(PlayApp.PATH_LEVELS));
  levelNames.sort();
  for (var i = 0; i < levelNames.length; i++) {
    if (levelNames[i] == fromLevelName) {
      break;
    }
  }
  this.levelName = levelNames[i + 1];
  this.page.exitDoc();
  this.page = new LevelPlayPage(this, this.gameTitle, this.basePath, this.fileTree, this.adventureName, this.levelName);
  this.page.enterDoc();
//  this.page.setPaused(true);
  this.maybeForwardShaderTexts();
};

PlayApp.prototype.getVertexShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.vertexShaderPath);
};

PlayApp.prototype.getFragmentShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.fragmentShaderPath);
};

PlayApp.prototype.getDataFileText = function() {
  return this.dataFileLoader.getTextByPath(this.dataFilePath);
};

PlayApp.prototype.getBeforeUnloadFunction = function() {
  var self = this;
  return function(e) {
    if (self.page) {
      self.page.exitDoc();
    }
  };
};

PlayApp.prototype.hasAdventure = function(name) {
  return this.fileTree.hasDescendants(PlayApp.path(this.basePath, name));
};

PlayApp.prototype.hasLevel = function(adventureName, levelName) {
  return this.fileTree.hasDescendants(PlayApp.path(this.basePath, adventureName, levelName));
};

PlayApp.path = function(base, adventureName, levelName) {
  if (adventureName && levelName) {
    return base.concat([PlayApp.PATH_ADVENTURES, adventureName, PlayApp.PATH_LEVELS, levelName]);
  } else if (adventureName) {
    return base.concat([PlayApp.PATH_ADVENTURES, adventureName]);
  } else {
    return base.concat();
  }
};
