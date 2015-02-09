// WebGL fundamentals
var canvas, vertexShader, fragmentShader, program, gl;

// locations of cached GL program data:
// uniforms
var uViewMatrix, uModelMatrix, uModelColor, uType, uTime;
// attributes
var aVertexPosition, aVertexColor;

// data buffers
// ...

var vec4 = new Vec4();
var mat4 = new Matrix44();
var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var array3 = [0, 0, 0];
var IDENTITY_VEC4 = [1, 1, 1, 1];

var ZOOM = 2;

function main() {
  canvas = document.querySelector('#canvas');

  gl = getWebGlContext(canvas, {
    alpha: false,
    antialias: true
  });

  loadText('vertex-shader.txt', function(text) {
    vertexShader = compileShader(gl, text, gl.VERTEX_SHADER);
    maybeCreateProgram();
  });

  loadText('fragment-shader.txt', function(text) {
    fragmentShader = compileShader(gl, text, gl.FRAGMENT_SHADER);
    maybeCreateProgram();
  });
}

function loadText(path, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.responseType = 'text';
  xhr.onload = function() {
    callback(this.response);
  };
  xhr.send();
}

function maybeCreateProgram() {
  if (!vertexShader || !fragmentShader) return;

  program = createProgram(gl, vertexShader, fragmentShader);
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.useProgram(program);

  onProgramCreated();
}

function onProgramCreated() {
  // Cache all the shader uniforms.
  uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
  uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
  uModelColor = gl.getUniformLocation(program, 'uModelColor');
  uType = gl.getUniformLocation(program, 'uType');
  uTime = gl.getUniformLocation(program, 'uTime');

  // Cache and enable the vertex position and color attributes.
  aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  gl.enableVertexAttribArray(aVertexPosition);
  aVertexColor = gl.getAttribLocation(program, 'aVertexColor');
  gl.enableVertexAttribArray(aVertexColor);

  initModels();
  loop();
}

var water;
var earth;
function initModels() {
  var model = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  for (var i = 0; i < model.vertexes.length; i++) {
    var r = Math.random() < (model.vertexes[i].position.v[0] + 1)/2 ? 1 : 0.1;
    var z = Math.abs(model.vertexes[i].position.v[1]) > 0.95 - Math.random() * 0.1;
    if (z) {
      model.vertexes[i].color.setXYZ(1, 1, 1);
    } else {
      model.vertexes[i].color.setXYZ(1 - r, 0.5 + r/2, 0);
    }
    if (z || r != 1) {
      model.vertexes[i].position.scaleToLength(1.01 + Math.random() * Math.random() * 0.15);
    } else {
      model.vertexes[i].position.scaleToLength(0.95);
    }
  }
  earth = model.createModelStamp(gl, aVertexPosition, aVertexColor);

  model = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  water = model.createModelStamp(gl, aVertexPosition, aVertexColor);
}

function loop() {
  maybeResize(canvas, gl);
  drawScene();
  requestAnimationFrame(loop, canvas);
}

function maybeResize(canvas, gl) {
  if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function drawScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // view
  var edge = Math.max(canvas.width, canvas.height);
  vec4.setXYZ(edge / (ZOOM * canvas.width), edge / (ZOOM * canvas.height), 0.7);
  viewMatrix.toScaleOp(vec4);
  gl.uniformMatrix4fv(uViewMatrix, gl.FALSE, viewMatrix.m);

  var size = 0.8;
  var t = Date.now();

  // model(s)
  earth.prepareToDraw(gl);
  modelMatrix.toIdentity();
  mat4.toRotateXOp(0.2);
  modelMatrix.multiply(mat4);
  mat4.toRotateZOp(-0.3);
  modelMatrix.multiply(mat4);
  mat4.toRotateYOp(t / 4000);
  modelMatrix.multiply(mat4);
  mat4.toScaleOp(vec4.setXYZ(size, size, size));
  modelMatrix.multiply(mat4);
  gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
  gl.uniform4fv(uModelColor, IDENTITY_VEC4);
  gl.uniform1i(uType, 0);
  earth.draw(gl);

  water.prepareToDraw(gl);
  modelMatrix.toIdentity();
  mat4.toRotateXOp(0.2);
  modelMatrix.multiply(mat4);
  mat4.toRotateZOp(-0.3);
  modelMatrix.multiply(mat4);
  mat4.toRotateYOp(t / 4000);
  modelMatrix.multiply(mat4);
  mat4.toScaleOp(vec4.setXYZ(size, size, size));
  modelMatrix.multiply(mat4);
  gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
  gl.uniform4fv(uModelColor, vec4.setXYZ(0, 0.3, 1).v);
  gl.uniform1i(uType, 0);
  water.draw(gl);
}
