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
var viewMatrix = new Matrix44();
var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var array3 = [0, 0, 0];
var bodyPos = new Vec2d();
var IDENTITY_VEC4 = [1, 1, 1, 1];

var ZOOM = 20;

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

function initModels() {
  // TODO
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
  var edgeLength = Math.min(canvas.width, canvas.height);
  vec4.setXYZ(ZOOM * edgeLength / canvas.width, ZOOM * edgeLength / canvas.height, 1);
  viewMatrix.toScaleOp(vec4);
  gl.uniformMatrix4fv(uViewMatrix, gl.FALSE, viewMatrix.m);

  // model(s)
  gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
  gl.uniform4fv(uModelColor, IDENTITY_VEC4);
  gl.uniform1i(uType, 0);
  // TODO
}
