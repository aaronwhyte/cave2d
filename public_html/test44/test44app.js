/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function Test44App(vertexShaderPath, fragmentShaderPath) {
  this.gameTitle = 'Test 44';
  this.vertexShaderPath = vertexShaderPath;
  this.fragmentShaderPath = fragmentShaderPath;
  this.page = null;
}

/**
 * Starts listening to hash-fragment queries, to navigate to the right page.
 */
Test44App.prototype.start = function() {
  this.shaderTextLoader = new TextLoader([this.vertexShaderPath, this.fragmentShaderPath]);
  var self = this;
  // pre-load, so the resources are ready ASAP.
  this.shaderTextLoader.load(function() {
    self.maybeForwardShaderTexts();
  });

  this.beforeUnloadFunction = this.getBeforeUnloadFunction();
  window.addEventListener('beforeunload', this.beforeUnloadFunction, false);

  self.page = new Test44Page(self.gameTitle);
  self.page.enterDoc();
  self.maybeForwardShaderTexts();
};

/**
 * If the shader texts are loaded, forward them to the current page.
 */
Test44App.prototype.maybeForwardShaderTexts = function() {
  var vt = this.getVertexShaderText();
  var ft = this.getFragmentShaderText();
  if (vt && ft && this.page && this.page.onShaderTextChange) {
    this.page.onShaderTextChange(vt, ft);
  }
};

Test44App.prototype.getVertexShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.vertexShaderPath);
};

Test44App.prototype.getFragmentShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.fragmentShaderPath);
};

Test44App.prototype.getBeforeUnloadFunction = function() {
  var self = this;
  return function(e) {
    if (self.page) {
      // If the page is the level editor, this will cause an auto-save.
      self.page.exitDoc();
    }
  };
};
