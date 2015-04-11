var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var viewMatrix = new Matrix44();

var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var glyphs, printer, stamps = {};
var startMatrix = new Matrix44()
    .multiply(mat4.toTranslateOp(vec4.setXYZ(-2.6, -2, -2)))
    .multiply(mat4.toScaleOp(vec4.setXYZ(0.2, 0.2, 0.2)))
    .multiply(mat4.toRotateZOp(Math.PI / 5))
    .multiply(mat4.toRotateXOp(0.3));
var nextCharMatrix = new Matrix44()
    .multiply(mat4.toTranslateOp(vec4.setXYZ(3.1, 0, 0)))
var ZOOM = 4;

function main() {
  canvas = document.querySelector('#canvas');
  new RendererLoader(canvas, 'vertex-shader.txt', 'fragment-shader.txt').load(onRendererLoaded);
}

function onRendererLoaded(r) {
  renderer = r;
  initStamps();
  loop();
}

function initStamps() {
  var lineWidth = 0.6;
  glyphs = new Glyphs(new GlyphMaker(lineWidth, lineWidth));
  glyphs.initStamps(renderer.gl);
  printer = new Printer(renderer, glyphs.stamps);

  var model = RigidModel.createOctahedron().sphereize(vec4.setXYZ(0, 0, 0), 0.8);
  stamps.octahedron = model.createModelStamp(renderer.gl);

  model = RigidModel.createCube().sphereize(vec4.setXYZ(0, 0, 0), 0.7);
  stamps.cube = model.createModelStamp(renderer.gl);
}

function loop() {
  drawScene();
  requestAnimationFrame(loop, canvas);
}

function drawScene() {
  renderer.resize().clear();

  var edge = Math.min(canvas.width, canvas.height);
  vec4.setXYZ(edge / (ZOOM * canvas.width), edge / (ZOOM * canvas.height), 0.3);
  viewMatrix.toScaleOp(vec4);

  var t = Date.now();

  mat4.toRotateXOp(Math.sin(t / 720) * 0.1);
  viewMatrix.multiply(mat4);

  mat4.toRotateYOp(Math.sin(t / 650) * 0.1);
  viewMatrix.multiply(mat4);

  renderer.setViewMatrix(viewMatrix);

  renderer.setColorVector(modelColor.setXYZ(Math.random(), Math.random()/5 + 0.5, Math.random()/5 + 0.8));

  printer.printLine(startMatrix, nextCharMatrix, "CAVE2D.COM!!");
  var size = 1.0;

  renderer
      .setStamp(stamps.cube)
      .setColorVector(modelColor.setXYZ(1, 1, 0.5));
  for (var y = -2; y <= 2; y++) {
    for (var x = -2; x <= 2; x++) {
      modelMatrix.toIdentity();

      mat4.toTranslateOp(vec4.setXYZ(x, y, 0));
      modelMatrix.multiply(mat4);

      mat4.toScaleOp(vec4.setXYZ(size, size, size));
      modelMatrix.multiply(mat4);

      mat4.toScaleOp(vec4.setXYZ(1, 1, Math.sin(x * y * t/700)*3.2 + 1));
      modelMatrix.multiply(mat4);

      renderer.setModelMatrix(modelMatrix);
      renderer.drawStamp();
    }
  }

  size = 0.3;
  renderer
      .setStamp(stamps.octahedron)
      .setColorVector(modelColor.setXYZ(0, 0.8, 1));
  for (var y = -7; y <= 7; y++) {
    for (var x = -7; x <= 7; x++) {
      modelMatrix.toIdentity();

      mat4.toTranslateOp(vec4.setXYZ(x + Math.sin(t/1000), y + Math.cos(t/1000), -2));
      modelMatrix.multiply(mat4);

      mat4.toScaleOp(vec4.setXYZ(size, size, size));
      modelMatrix.multiply(mat4);

      mat4.toRotateZOp(Math.sin((x+y)*(x-y) * t / 900) * 0.1);
      modelMatrix.multiply(mat4);

      renderer.setModelMatrix(modelMatrix);
      renderer.drawStamp();
    }
  }
}
