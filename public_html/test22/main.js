var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var viewMatrix = new Matrix44();

var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var stamps = {};

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
  var model = RigidModel.createOctahedron()
      .sphereize(vec4.setXYZ(0, 0, 0), 0.8);
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

  mat4.toRotateXOp(Math.sin(t / 720) * 0.2);
  viewMatrix.multiply(mat4);

  mat4.toRotateYOp(Math.sin(t / 650) * 0.2);
  viewMatrix.multiply(mat4);

  renderer.setViewMatrix(viewMatrix);


  var size = 1.0;
  renderer
      .setStamp(stamps.cube)
      .setColorVector(modelColor.setXYZ(1, 1, 0.5));
  for (var y = -5; y <= 5; y++) {
    for (var x = -5; x <= 5; x++) {
      modelMatrix.toIdentity();

      mat4.toTranslateOp(vec4.setXYZ(x, y, 0));
      modelMatrix.multiply(mat4);

      mat4.toScaleOp(vec4.setXYZ(size, size, size));
      modelMatrix.multiply(mat4);

      mat4.toScaleOp(vec4.setXYZ(1, 1, Math.sin(x * y * t/7000)*3.2 + 1));
      modelMatrix.multiply(mat4);

      renderer.setModelMatrix(modelMatrix);
      renderer.drawStamp();
    }
  }

  size = 0.3;
  renderer
      .setStamp(stamps.octahedron)
      .setColorVector(modelColor.setXYZ(0, 0.8, 1));
  for (var y = -5; y <= 5; y++) {
    for (var x = -5; x <= 5; x++) {
      modelMatrix.toIdentity();

      mat4.toTranslateOp(vec4.setXYZ(x, y, -1.4));
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
