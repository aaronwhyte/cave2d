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

var ZOOM = 10;

function main() {
  canvas = document.querySelector('#canvas');

  gl = getWebGlContext(canvas, {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
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

var model;
var stamp;
function initModels() {
  model = new RigidModel();
  var a = model.addVertex(new Vertex().setPositionXYZ(-1, -1, 1).setColorRGB(0, 0, 0));
  var b = model.addVertex(new Vertex().setPositionXYZ(0, 1, 0).setColorRGB(1, 0, 0));
  var c = model.addVertex(new Vertex().setPositionXYZ(1, -1, 1).setColorRGB(0, 0, 0));
  model.addTriangle(a, b, c);

  stamp = model.createModelStamp(gl, aVertexPosition, aVertexColor);
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
  stamp.prepareToDraw(gl, aVertexPosition, aVertexColor);

  var r = 10;
  for (var y = -r; y <= r; y++) {
    for (var x = -r; x <= r; x++) {
      vec4.setXYZ(x, y, 0);
      modelMatrix.toIdentity();
      mat4.toTranslateOp(vec4);
      modelMatrix.multiply(mat4);
      mat4.toRotateZOp((x + y + 0.01) * Date.now() / 5000);
      modelMatrix.multiply(mat4);
      gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
      gl.uniform4fv(uModelColor, IDENTITY_VEC4);
      gl.uniform1i(uType, 0);
      stamp.draw(gl);
    }
  }
}
