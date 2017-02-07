/**
 * Generic app for editing a game's adventures and levels.
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function Test42App(vertexShaderPath, fragmentShaderPath) {
  this.gameTitle = 'Test 42';
  this.vertexShaderPath = vertexShaderPath;
  this.fragmentShaderPath = fragmentShaderPath;
  this.page = null;
}

/**
 * Starts listening to hash-fragment queries, to navigate to the right page.
 */
Test42App.prototype.start = function() {
  this.shaderTextLoader = new TextLoader([this.vertexShaderPath, this.fragmentShaderPath]);
  var self = this;
  // pre-load, so the resources are ready ASAP.
  this.shaderTextLoader.load(function() {
    self.maybeForwardShaderTexts();
  });

  this.beforeUnloadFunction = this.getBeforeUnloadFunction();
  window.addEventListener('beforeunload', this.beforeUnloadFunction, false);

  self.page = new Test42Page(self.gameTitle);
  self.page.enterDoc();
  self.maybeForwardShaderTexts();
};

/**
 * If the shader texts are loaded, forward them to the current page.
 */
Test42App.prototype.maybeForwardShaderTexts = function() {
  var vt = this.getVertexShaderText();
  var ft = this.getFragmentShaderText();
  if (vt && ft && this.page && this.page.onShaderTextChange) {
    this.page.onShaderTextChange(vt, ft);
  }
};

Test42App.prototype.getVertexShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.vertexShaderPath);
};

Test42App.prototype.getFragmentShaderText = function() {
  return this.shaderTextLoader.getTextByPath(this.fragmentShaderPath);
};

Test42App.prototype.getBeforeUnloadFunction = function() {
  var self = this;
  return function(e) {
    if (self.page) {
      // If the page is the level editor, this will cause an auto-save.
      self.page.exitDoc();
    }
  };
};
