/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @param {String} dataFilePath
 * @param {function} playLevelPageCtor
 * @constructor
 */
function PlayApp(gameTitle, basePath, vertexShaderPath, fragmentShaderPath,
                 dataFilePath, playLevelPageCtor) {
  BaseApp.call(this, gameTitle, basePath, vertexShaderPath, fragmentShaderPath);
  this.dataFilePath = dataFilePath;
  this.playLevelPageCtor = playLevelPageCtor;
}
PlayApp.prototype = new BaseApp();
PlayApp.prototype.constructor = PlayApp;

PlayApp.prototype.start = function() {
  this.startLoadingShaders();

  var self = this;
  this.dataFileLoader = new TextLoader([this.dataFilePath]);
  this.dataFileLoader.load(function() {
    self.onDataFileLoaded();
  });
};

PlayApp.prototype.getFileTree = function() {
  return this.fileTree;
};

PlayApp.prototype.onDataFileLoaded = function() {
  var jsonText = this.dataFileLoader.getTextByPath(this.dataFilePath);
  var jsonObj = JSON.parse(jsonText);
  this.fileTree = new FileTree(new JsonStorage(jsonObj));

  // Start on the first (only) adventure's first (zeroeth) level.
  var adventureNames = this.fileTree.listChildren(BaseApp.path(this.basePath).concat(BaseApp.PATH_ADVENTURES));
  this.adventureName = adventureNames[0];
  var levelNames = this.fileTree.listChildren(BaseApp.path(this.basePath, this.adventureName).concat(BaseApp.PATH_LEVELS));
  this.levelName = levelNames.sort()[0];
  this.page = this.createPlayLevelPage();
  this.page.enterDoc();
  this.page.setPaused(true);
  this.maybeForwardShaderTexts();
};

PlayApp.prototype.getDataFileText = function() {
  return this.dataFileLoader.getTextByPath(this.dataFilePath);
};

PlayApp.prototype.createPlayLevelPage = function(startingGameState) {
  return new this.playLevelPageCtor(
      this, this.gameTitle, this.basePath, this.fileTree, this.adventureName, this.levelName,
      startingGameState);
};

PlayApp.prototype.exitLevel = function(fromAdventureName, fromLevelName, gameState) {
  var levelNames = this.fileTree.listChildren(BaseApp.path(this.basePath, fromAdventureName).concat(BaseApp.PATH_LEVELS));
  levelNames.sort();
  for (var i = 0; i < levelNames.length; i++) {
    if (levelNames[i] === fromLevelName) {
      break;
    }
  }
  this.page.exitDoc();
  if (i === levelNames.length - 1) {
    this.page = new VictoryPage(this, gameState);
    this.page.enterDoc();
  } else {
    this.levelName = levelNames[i + 1];
    this.page = this.createPlayLevelPage(gameState);
    this.page.enterDoc();
    this.maybeForwardShaderTexts();
  }
};

PlayApp.prototype.restartLevel = function(gameState) {
  this.page.exitDoc();
  this.page = this.createPlayLevelPage(gameState);
  this.page.enterDoc();
  this.maybeForwardShaderTexts();
};
