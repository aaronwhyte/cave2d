var canvas, renderer;

var vec4 = new Vec4();
var mat4 = new Matrix44();
var viewMatrix = new Matrix44();

var modelMatrix = new Matrix44();
var modelColor = new Vec4();

var stamps = {};

var ZOOM = 3;

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
  var model = RigidModel.createOctahedron().sphereize(vec4.setXYZ(0, 0, 0), 1);
  stamps.earth = model.createModelStamp(renderer.gl);

  model = RigidModel.createCube().sphereize(vec4.setXYZ(0, 0, 0), 1);
  //model.transformPositions(mat4.toScaleOp(vec4.setXYZ(0.5, 0.5, 0.5)));
  stamps.water = model.createModelStamp(renderer.gl);
}

function loop() {
  drawScene();
  requestAnimationFrame(loop, canvas);
}

function drawScene() {
  renderer.resize().clear();

  var edge = Math.min(canvas.width, canvas.height);
  vec4.setXYZ(edge / (ZOOM * canvas.width), edge / (ZOOM * canvas.height), 0.5);
  viewMatrix.toScaleOp(vec4);
  renderer.setViewMatrix(viewMatrix);

  var size = 1.6;
  var t = Date.now();

  modelMatrix.toIdentity();
  mat4.toRotateXOp(0.2);
  modelMatrix.multiply(mat4);
  mat4.toRotateZOp(-0.3);
  modelMatrix.multiply(mat4);
  mat4.toRotateYOp(t / 500);
  modelMatrix.multiply(mat4);
  mat4.toScaleOp(vec4.setXYZ(size, size, size));
  modelMatrix.multiply(mat4);
  renderer.setModelMatrix(modelMatrix);

  renderer
      .setStamp(stamps.earth)
      .setColorVector(modelColor.setXYZ(1, 1, 1))
      .drawStamp();

  renderer
      .setStamp(stamps.water)
      .setColorVector(modelColor.setXYZ(Math.abs(Math.sin(t/200)), Math.random, 0.5))
      .drawStamp();
}
