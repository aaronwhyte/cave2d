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
  this.isBatching = false;

  this.circleArray = [];
  this.modeStack = [];

  // stats
  this.drawCount = 0;
  this.drawMs = 0;
}

Renderer.EMPTY_WARP_TYPES = [
    0, 0, 0, 0,
    0, 0, 0, 0];

Renderer.EMPTY_WARP_DATA = [
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0];

Renderer.TEXTURE_NONE = 0;
Renderer.TEXTURE_WALL = 1;

Renderer.POLY_LINE_POINT_COUNT = 40;
Renderer.BATCH_MAX = 10;

Renderer.prototype.initAttributesAndUniforms = function() {
  this.createVertexAttribute('aVertexPosition');
  this.createVertexAttribute('aVertexColor');
  this.createVertexAttribute('aVertexGroup');
  this.createVertexAttribute('aVertexInstance');
  this.createUniform('uViewMatrix');
  this.createUniform('uModelMatrix');
  this.createUniform('uModelMatrix2');
  this.createUniform('uModelColor');

  // normal=0, circles=1, statgraph=2
  this.createUniform('uType');

  // 1 if using batched drawing
  this.createUniform('uBatching');

  this.createUniform('uCircles');
  this.createUniform('uCircleCount');

  // this.createUniform('uWarpType');
  // this.createUniform('uWarpData');
  //
  // this.createUniform('uTexture');
  // this.createUniform('uTime');
  //
  // this.createUniform('uPolyLineData');
  // this.createUniform('uPolyLineHeadIndex');
  // this.createUniform('uPolyLinePointCount');

  this.createUniform('uModelMatrixBatch');
  this.createUniform('uModelMatrix2Batch');
  this.createUniform('uModelColorBatch');
};

Renderer.prototype.setWarps = function(type, data) {
  this.gl.uniform1iv(this.uWarpType, type);
  this.gl.uniform4fv(this.uWarpData, data);
};

Renderer.prototype.clearWarps = function() {
  this.gl.uniform1iv(this.uWarpType, Renderer.EMPTY_WARP_TYPES);
  this.gl.uniform4fv(this.uWarpData, Renderer.EMPTY_WARP_DATA);
};

Renderer.prototype.setTexture = function(texture) {
  this.gl.uniform1i(this.uTexture, texture);
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
  if (this.canvas.width !== this.canvas.clientWidth ||
      this.canvas.height !== this.canvas.clientHeight) {
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
  this.setBatching(false);
  this.gl.uniformMatrix4fv(this.uModelMatrix, this.gl.FALSE, modelMatrix.m);
  return this;
};

/**
 * Sets the shader's second model matrix uniform.
 * @param {Matrix44} modelMatrix2
 * @return {Renderer}
 */
Renderer.prototype.setModelMatrix2 = function(modelMatrix2) {
  this.setBatching(false);
  this.gl.uniformMatrix4fv(this.uModelMatrix2, this.gl.FALSE, modelMatrix2.m);
  return this;
};

/**
 * Sets the shader's color vector uniform.
 * @param {Vec4} color
 * @return {Renderer}
 */
Renderer.prototype.setColorVector = function(color) {
  this.setBatching(false);
  if (!this.oldColor.equals(color)) {
    this.oldColor.set(color);
    this.gl.uniform4fv(this.uModelColor, this.oldColor.v);
  }
  return this;
};

Renderer.prototype.setCircleMode = function(circles) {
  if (circles.length * 3 !== this.circleArray.length) {
    this.circleArray.length = circles.length * 3;
  }
  for (let i = 0; i < circles.length; i++) {
    let c = circles[i];
    this.circleArray[i * 3] = c.pos.x;
    this.circleArray[i * 3 + 1] = c.pos.y;
    this.circleArray[i * 3 + 2] = c.rad;
  }
  this.gl.uniform1i(this.uType, 1);
  this.gl.uniform1i(this.uCircleCount, circles.length);
  this.gl.uniform3fv(this.uCircles, this.circleArray);
  return this;
};

Renderer.prototype.setNormalMode = function() {
  this.gl.uniform1i(this.uType, 0);
  return this;
};

Renderer.prototype.setPolyLineMode = function() {
  this.gl.uniform1i(this.uType, 2);
  return this;
};

/**
 * Lazily turn batching on and off.
 * @param {Boolean} b
 * @returns {Renderer}
 */
Renderer.prototype.setBatching = function(b) {
  if (this.isBatching !== b) {
    this.gl.uniform1i(this.uBatching, b ? 1 : 0);
    this.isBatching = b;
  }
  return this;
};

Renderer.prototype.setTime = function(t) {
  // this.gl.uniform1f(this.uTime, t);
  return this;
};

/**
 * Prepares for stamp() calls.
 * @param {ModelStamp} stamp
 * @return {Renderer}
 */
Renderer.prototype.setStamp = function(stamp) {
  if (this.modelStamp === null || this.modelStamp.id !== stamp.id) {
    this.modelStamp = stamp;
    stamp.prepareToDraw(this.gl, this.aVertexPosition, this.aVertexColor, this.aVertexGroup, this.aVertexInstance);
  }
  return this;
};

/**
 * Draws the ModelStamp set by setStamp(), with the current
 * modelMatrix, colorVector, and view uniforms.
 * @return {Renderer}
 */
Renderer.prototype.drawStamp = function() {
  this.drawCount++;
  let t0 = performance.now();
  this.modelStamp.draw(this.gl);
  this.drawMs += performance.now() - t0;
  return this;
};

Renderer.prototype.setPolyLineCircularQueue = function(xyCircularQueue) {
  this.gl.uniform1fv(this.uPolyLineData, xyCircularQueue.getArray());
  this.gl.uniform1f(this.uPolyLineHeadIndex, xyCircularQueue.head);
  this.gl.uniform1f(this.uPolyLinePointCount, xyCircularQueue.size() / 2);
  return this;
};


Renderer.prototype.setBatchUniforms = function(colors, models, model2s) {
  this.setBatching(true);
  this.gl.uniform4fv(this.uModelColorBatch, colors);
  this.gl.uniformMatrix4fv(this.uModelMatrixBatch, this.gl.FALSE, models);
  if (model2s) this.gl.uniformMatrix4fv(this.uModelMatrix2Batch, this.gl.FALSE, model2s);
};