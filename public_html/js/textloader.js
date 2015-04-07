/**
 * @param {Array.<String>} paths
 * @constructor
 */
function TextLoader(paths) {
  this.paths = paths;
  this.texts = {};
}

/**
 * @param {Function} callback
 */
TextLoader.prototype.load = function(callback) {
  this.callback = callback;
  for (var i = 0; i < this.paths.length; i++) {
    this.loadTextNum(i);
  }
};

TextLoader.prototype.getTextByIndex = function(num) {
  return this.getTextByPath(this.paths[num]);
};

TextLoader.prototype.getTextByPath = function(path) {
  return this.texts[path];
};


/////////////
// PRIVATE //
/////////////

TextLoader.prototype.loadTextNum = function(num) {
  var path = this.paths[num];
  if (!this.texts[path]) {
    this.xhr(path, this.getOnTextLoadedFunc(num));
  }
};

TextLoader.prototype.getOnTextLoadedFunc = function(num) {
  var self = this;
  return function(text) {
    var path = self.paths[num];
    self.texts[path] = text;
    self.callback && self.callback(num);
  };
};

TextLoader.prototype.xhr = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'text';
  xhr.onload = function() {
    callback(this.response);
  };
  xhr.send();
};
