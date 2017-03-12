/**
 * The renderer has the viewport state,
 * manages uniforms and attributes,
 * and can draw a ModelStamp.
 * @param canvas
 * @param gl
 * @param program
 * @constructor
 */
function Renderer(canvas, gl, program) {
  this.canvas = canvas;
  this.gl = gl;
  this.program = program;
  this.initAttributesAndUniforms();
  this.modelStamp = null;
  this.oldColor = new Vec4(-1, -1, -1);
}

Renderer.prototype.initAttributesAndUniforms = function() {
  this.createVertexAttribute('aVertexPosition');
  this.createVertexAttribute('aVertexColor');
  this.createVertexAttribute('aVertexGroup');
  this.createUniform('uViewMatrix');
  this.createUniform('uModelMatrix');
  this.createUniform('uModelMatrix2');
  this.createUniform('uModelColor');

  this.createUniform('uType');
  this.createUniform('uCircleRad');
  this.createUniform('uCirclePos');
  this.createUniform('uCircleCount');
};

Renderer.prototype.createVertexAttribute = function(name) {
  this[name] = this.gl.getAttribLocation(this.program, name);
  this.gl.enableVertexAttribArray(this[name]);
};

Renderer.prototype.createUniform = function(name) {
  this[name] = this.gl.getUniformLocation(this.program, name);
};

Renderer.COLOR_WHITE = new Vec4(1, 1, 1, 1);

/**
 * @return {Renderer}
 */
Renderer.prototype.resize = function() {
  if (this.canvas.width != this.canvas.clientWidth ||
      this.canvas.height != this.canvas.clientHeight) {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  return this;
};

/**
 * @return {Renderer}
 */
Renderer.prototype.clear = function() {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  // This is to work around an unexplained bug in game1 and test35 (and a few more) where
  // adding a new terrain tile model somehow invalidates the GL model stamp state from the last frame.
  this.modelStamp = null;
  this.oldColor.setRGBA(-1, -1, -1, -1);

  return this;
};

/**
 * @return {Renderer}
 */
Renderer.prototype.setBlendingEnabled = function(blend) {
  if (blend) {
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE)
  } else {
    this.gl.disable(this.gl.BLEND);
  }
  return this;
};

/**
 * @return {Renderer}
 */
Renderer.prototype.clearColor = function(r, g, b, a) {
  this.gl.clearColor(r, g, b, a);
  return this;
};

/**
 * @param {Matrix44} viewMatrix
 * @return {Renderer}
 */
Renderer.prototype.setViewMatrix = function(viewMatrix) {
  this.viewMatrix = viewMatrix;
  this.gl.uniformMatrix4fv(this.uViewMatrix, this.gl.FALSE, viewMatrix.m);
  return this;
};

/**
 * @return {Matrix44} A reference to the inner viewMatrix, which may change.
 */
Renderer.prototype.getViewMatrix = function() {
  return this.viewMatrix;
};

/**
 * Sets the shader's model matrix uniform.
 * @param {Matrix44} modelMatrix
 * @return {Renderer}
 */
Renderer.prototype.setModelMatrix = function(modelMatrix) {
  this.gl.uniformMatrix4fv(this.uModelMatrix, this.gl.FALSE, modelMatrix.m);
  return this;
};

/**
 * Sets the shader's second model matrix uniform.
 * @param {Matrix44} modelMatrix2
 * @return {Renderer}
 */
Renderer.prototype.setModelMatrix2 = function(modelMatrix2) {
  this.gl.uniformMatrix4fv(this.uModelMatrix2, this.gl.FALSE, modelMatrix2.m);
  return this;
};

/**
 * Sets the shader's color vector uniform.
 * @param {Vec4} color
 * @return {Renderer}
 */
Renderer.prototype.setColorVector = function(color) {
  if (!this.oldColor.equals(color)) {
    this.oldColor.set(color);
    this.gl.uniform4fv(this.uModelColor, this.oldColor.v);
  }
  return this;
};

Renderer.prototype.setCircleMode = function(circles) {
  var radArray = [];
  var posArray = [];
  for (var i = 0; i < circles.length; i++) {
    var c = circles[i];
    radArray.push(c.rad);
    posArray.push(c.pos.x, c.pos.y, 0, 0);
  }
  this.gl.uniform1i(this.uType, 1);
  this.gl.uniform1i(this.uCircleCount, circles.length);
  this.gl.uniform1fv(this.uCircleRad, radArray);
  this.gl.uniform4fv(this.uCirclePos, posArray);
};

Renderer.prototype.setNormalMode = function() {
  this.gl.uniform1i(this.uType, 0);
};

/**
 * Prepares for stamp() calls.
 * @param {ModelStamp} stamp
 * @return {Renderer}
 */
Renderer.prototype.setStamp = function(stamp) {
  if (this.modelStamp == null || this.modelStamp.id !== stamp.id) {
    this.modelStamp = stamp;
    stamp.prepareToDraw(this.gl, this.aVertexPosition, this.aVertexColor, this.aVertexGroup);
  }
  return this;
};

/**
 * Draws the ModelStamp set by setStamp(), with the current
 * modelMatrix, colorVector, and view uniforms.
 * @return {Renderer}
 */
Renderer.prototype.drawStamp = function() {
  this.modelStamp.draw(this.gl);
  return this;
};
