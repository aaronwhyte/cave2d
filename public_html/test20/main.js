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

var ZOOM = 5;

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

var glyphs;
function initStamps() {
  var lineWidth = 0.6;
  glyphs = new Glyphs(new GlyphMaker(lineWidth, lineWidth));
  glyphs.initStamps(gl, aVertexPosition, aVertexColor);
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
  var edge = Math.min(canvas.width, canvas.height);
  vec4.setXYZ(edge / (ZOOM * canvas.width), edge / (ZOOM * canvas.height), 1);
  viewMatrix.toScaleOp(vec4);
  gl.uniformMatrix4fv(uViewMatrix, gl.FALSE, viewMatrix.m);

  var i = 0;
  var r = 8;
  for (var letter in glyphs.stamps) {
    glyphs.stamps[letter].prepareToDraw(gl);

    var x = ((i % r) - r/2);
    var y = (r/3 - Math.floor(i / r)) * 1.5;
    var t = Date.now();
    modelMatrix.toIdentity();
    mat4.toTranslateOp(vec4.setXYZ(x, y, 0));
    modelMatrix.multiply(mat4);
    mat4.toRotateXOp(Math.sin((t + 1000 * i) / 800) / 2);
    modelMatrix.multiply(mat4);
    mat4.toRotateYOp(Math.sin((t + 1000 * i) / 1200) / 2);
    modelMatrix.multiply(mat4);
    mat4.toScaleOp(vec4.setXYZ(0.3, 0.3, 0.3));
    modelMatrix.multiply(mat4);

    gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, modelMatrix.m);
    gl.uniform4fv(uModelColor, IDENTITY_VEC4);
    glyphs.stamps[letter].draw(gl);
    i++;
  }
}
