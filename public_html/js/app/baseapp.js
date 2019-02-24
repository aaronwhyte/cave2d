/**
 * Baseclass for PlayApp and EditApp
 * @param {String} gameTitle
 * @param {Array.<String>} basePath
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function BaseApp(gameTitle, basePath, vertexShaderPath, fragmentShaderPath) {
  this.gameTitle = gameTitle;
  this.basePath = basePath;
  this.vertexShaderPath = vertexShaderPath;
  this.fragmentShaderPath = fragmentShaderPath;
  this.page = null;
}

BaseApp.PATH_ADVENTURES = 'adventures';
BaseApp.PATH_LEVELS = 'levels';
BaseApp.PATH_LEVEL_JSON = 'leveljson';

BaseApp.path = function(base, adventureName, levelName) {
  if (adventureName && levelName) {
    return base.concat([BaseApp.PATH_ADVENTURES, adventureName, BaseApp.PATH_LEVELS, levelName]);
  } else if (adventureName) {
    return base.concat([BaseApp.PATH_ADVENTURES, adventureName]);
  } else {
    return base.concat();
  }
};

/**
 * @return {FileTree} some kinda file tree.
 */
BaseApp.prototype.getFileTree = function() {
  throw "Implement getFileTree";
};

BaseApp.prototype.startLoadingShaders = function() {
  let self = this;
  this.shaderTextLoader = new TextLoader([this.vertexShaderPath, this.fragmentShaderPath]);
  this.shaderTextLoader.load(function() {
    self.maybeForwardShaderTexts();
  });
};

/**
 * If both shader texts are loaded and the page exists, forward shader texts to the page.
 */
BaseApp.prototype.maybeForwardShaderTexts = function() {
  let vt = this.getVertexShaderText();
  let ft = this.getFragmentShaderText();
  if (vt && ft && this.page && this.page.onShaderTextChange) {
    this.page.onShaderTextChange(vt, ft);
  }
};

BaseApp.prototype.getVertexShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.vertexShaderPath);
};

BaseApp.prototype.getFragmentShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.fragmentShaderPath);
};

BaseApp.prototype.getBeforeUnloadFunction = function() {
  let self = this;
  return function(e) {
    if (self.page) {
      self.page.exitDoc();
    }
  };
};

BaseApp.prototype.hasAdventure = function(name) {
  return this.getFileTree().hasDescendants(BaseApp.path(this.basePath, name));
};

BaseApp.prototype.hasLevel = function(adventureName, levelName) {
  return this.getFileTree().hasDescendants(BaseApp.path(this.basePath, adventureName, levelName));
};

BaseApp.prototype.gotoPage = function(newPage) {
  if (this.page) {
    this.page.exitDoc();
  }
  this.page = newPage;
  newPage.enterDoc();
};
