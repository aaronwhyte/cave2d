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
var bodyPos = new Vec2d();
var IDENTITY_VEC4 = [1, 1, 1, 1];

var ZOOM = 10;

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

  initStamps();
  loop();
}

var stamps = {};
function initStamps() {
  var total = new RigidModel();
  var v = new Vec4;
  var m = new Matrix44();

  var top = RigidModel.createCube();
  var fat = 0.5;
  var depth = 1;
  top.transformPositions(m.toScaleOp(v.setXYZ(1 + fat, fat, depth)));
  top.transformPositions(m.toTranslateOp(v.setXYZ(0, 1, 0)));
  total.addRigidModel(top);

  var mid = RigidModel.createCube();
  mid.transformPositions(m.toScaleOp(v.setXYZ(0.8 + fat, fat, depth)));
  mid.transformPositions(m.toTranslateOp(v.setXYZ(-0.2/2, 0, 0)));
  total.addRigidModel(mid);

  var left = RigidModel.createCube();
  left.transformPositions(m.toScaleOp(v.setXYZ(fat, 2 + fat, depth)));
  left.transformPositions(m.toTranslateOp(v.setXYZ(-0.5, 0, 0)));
  total.addRigidModel(left);

  stamps['F'] = total.createModelStamp(gl, aVertexPosition, aVertexColor);
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
  vec4.setXYZ(edge / (ZOOM * canvas.width), edge / (ZOOM * canvas.height), 1);
  viewMatrix.toScaleOp(vec4);
  gl.uniformMatrix4fv(uViewMatrix, gl.FALSE, viewMatrix.m);

  // model(s)
  stamps['F'].prepareToDraw(gl);

  var r = 11;
  var t = Date.now();
  for (var y = -r; y <= r; y++) {
    for (var x = -r; x <= r; x++) {
      modelMatrix.toIdentity();
      mat4.toTranslateOp(vec4.setXYZ(x + Math.sin(y/3 + t / 2000), y + Math.cos(x/3 + t / 2000), 0));
      modelMatrix.multiply(mat4);
      mat4.toRotateXOp((x) * t / 4000);
      modelMatrix.multiply(mat4);
      mat4.toRotateYOp((y) * t / 8000);
      modelMatrix.multiply(mat4);
      mat4.toRotateZOp((x * y + 1) * t / 16000);
      modelMatrix.multiply(mat4);
      mat4.toScaleOp(vec4.setXYZ(0.5, 0.5, 0.5));
      modelMatrix.multiply(mat4);
      gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
      gl.uniform4fv(uModelColor, IDENTITY_VEC4);
      gl.uniform1i(uType, 0);
      stamps['F'].draw(gl);
    }
  }
}
