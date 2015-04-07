/**
 * Asynchronously creates a Renderer by loading and compiling shaders.
 * @param canvas
 * @param {String} vertexShaderPath
 * @param {String} fragmentShaderPath
 * @constructor
 */
function RendererLoader(canvas, vertexShaderPath, fragmentShaderPath) {
  this.canvas = canvas;
  this.textLoader = new TextLoader([vertexShaderPath, fragmentShaderPath]);
  this.renderer = null;
}

/**
 * @param callback called with the renderer as a parameter, when the renderer is loaded
 */
RendererLoader.prototype.load = function(callback) {
  this.callback = callback;
  var self = this;
  this.textLoader.load(function() {
    self.invalidate();
  });
};

RendererLoader.prototype.invalidate = function() {
  var vsText = this.textLoader.getTextByIndex(0);
  var fsText = this.textLoader.getTextByIndex(1);
  if (!this.renderer && vsText && fsText) {
    var gl = getWebGlContext(this.canvas, {
      alpha: false,
      antialias: true
    });
    var vs = compileShader(gl, vsText, gl.VERTEX_SHADER);
    var fs = compileShader(gl, fsText, gl.FRAGMENT_SHADER);
    var program = createProgram(gl, vs, fs);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
    this.renderer = new Renderer(this.canvas, gl, program);
    this.callback(this.renderer);
  }
};
