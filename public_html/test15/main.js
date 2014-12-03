var canvas, vertexShader, fragmentShader, program, gl;
var bgVertBuff, bgColorBuff;

var CELLS_X = 64;
var CELLS_Y = 64;
var CELLS_COUNT = CELLS_X * CELLS_Y;

function main() {
  canvas = document.querySelector('#canvas');

  gl = getWebGlContext(canvas, {
    alpha: false,
    antialias: true
  });

  loadText('vertex-shader.glsl', function(text) {
    vertexShader = compileShader(gl, text, gl.VERTEX_SHADER);
    maybeCreateProgram();
  });

  loadText('fragment-shader.glsl', function(text) {
    fragmentShader = compileShader(gl, text, gl.FRAGMENT_SHADER);
    maybeCreateProgram();
  });
}

function loadText(path, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.responseType = 'text';
  xhr.onload = function(e) {
    callback(this.response);
  };
  xhr.send();
}

function maybeCreateProgram() {
  if (!vertexShader || !fragmentShader) return;

  program = createProgram(gl, vertexShader, fragmentShader);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);

  onProgramCreated();
}

function onProgramCreated() {
  initBackgroundData(gl);
  loop();
}

function initBackgroundData(gl) {
  var verts = [];
  var colors = [];

  for (var y = 0; y < CELLS_Y; y++) {
    for (var x = 0; x < CELLS_X; x++) {
      var px = 2 * ((x + 0.5) / CELLS_X - 0.5) + Math.random() - 0.5;
      var py = 2 * ((y + 0.5) / CELLS_Y - 0.5) + Math.random() - 0.5;
      var rx = (1 + Math.random()) / CELLS_X;
      var ry = (1 + Math.random()) / CELLS_Y;
      var r, g, b;
      r = Math.random() / 3;
      g = Math.random() / 3;
      b = 1 - Math.random() / 3;
      addRect(verts, colors, px, py, 0, rx, ry, r, g, b);
    }
  }

  bgVertBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgVertBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

  bgColorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bgColorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

function addRect(verts, colors, px, py, pz, rx, ry, r, g, b) {
  // Two triangles form a square.
  verts.push(
      px-rx, py-ry, pz,
      px-rx, py+ry, pz,
      px+rx, py+ry, pz,

      px+rx, py+ry, pz,
      px+rx, py-ry, pz,
      px-rx, py-ry, pz);
  for (var i = 0; i < 6; i++) {
    colors.push(r, g, b, 1);
  }
}

function loop() {
  maybeResize(canvas, gl);
  drawScene(gl, program);
  requestAnimationFrame(loop, canvas);
}

function maybeResize(canvas, gl) {
  if (canvas.width != canvas.clientWidth || canvas.height != canvas.clientHeight) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function drawScene(gl, program) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var uTranslation = gl.getUniformLocation(program, "uTranslation");
  var t = Date.now() / 1000;
//  var translation = [0, 0, 0];
  var translation = [Math.sin(t), -Math.cos(t), 0];
  gl.uniform3fv(uTranslation, translation);

  var edgeLength = Math.min(canvas.width, canvas.height);
  var uScale = gl.getUniformLocation(program, "uScale");
  var scale = [(Math.sin(t/10) + 1.1) * edgeLength / canvas.width, (Math.sin(t/10) + 1.1) * edgeLength / canvas.height, 1];
//  var scale = [1 * edgeLength / canvas.width, 1 * edgeLength / canvas.height, 1];
  gl.uniform3fv(uScale, scale);

  // background
  drawTriangles(gl, program, bgColorBuff, bgVertBuff, CELLS_COUNT * 2);

  // foreground
  var verts = [];
  var colors = [];
  addRect(verts, colors, Math.sin(t * 5), Math.cos(t * 5), -1, 0.1, 0.1, 1, 1, 1);

  var fgVertBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fgVertBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

  var fgColorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fgColorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  drawTriangles(gl, program, fgColorBuff, fgVertBuff, 2);
}

function drawTriangles(gl, program, colorBuff, vertBuff, triangleCount) {
  var aVertexColor = gl.getAttribLocation(program, "aVertexColor");
  gl.enableVertexAttribArray(aVertexColor);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
  gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);

  var aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
  gl.enableVertexAttribArray(aVertexPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertBuff);
  gl.vertexAttribPointer(aVertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, triangleCount * 3);
}
