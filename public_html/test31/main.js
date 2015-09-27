function main() {
  var test31 = new Test31();
}

function Test31() {
  this.canvas = document.querySelector('#canvas');
  this.viewMatrix = new Matrix44();
  this.vec4 = new Vec4(1, 1, 1);
  this.mat44 = new Matrix44();
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // on-event sound unlocker for iOS
  this.iosSoundUnlocked = false;
  document.body.addEventListener('mousedown', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchstart', this.unlockIosSound.bind(this));

  this.loopFn = this.loop.bind(this);
}

Test31.VISIBLE_WORLD = 3;

Test31.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Test31.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.initStamps();
  this.loop();
};

Test31.prototype.initStamps = function() {
  var model = RigidModel.createCircleMesh(5);
  for (var i = 0, n = model.vertexes.length; i < n; i++) {
    var p = model.vertexes[i].position;
    var c = 1 - p.magnitudeSquared() * 0.8;
    model.vertexes[i].setColorRGB(c, c, c);
  }
  this.triangleStamp = model.createModelStamp(this.renderer.gl);
};

Test31.prototype.loop = function() {
  this.renderer.resize().clear();
  this.draw();
  requestAnimationFrame(this.loopFn, this.canvas);
};

Test31.prototype.updateViewMatrix = function() {
  // set view matrix
  var scale = 2 * this.canvas.width * this.canvas.height / (this.canvas.width + this.canvas.height);
  this.viewMatrix.toScaleOpXYZ(
          scale / (Test31.VISIBLE_WORLD * canvas.width),
          scale / (Test31.VISIBLE_WORLD * canvas.height),
          1);
  this.renderer.setViewMatrix(this.viewMatrix);
};

Test31.prototype.draw = function() {
  this.updateViewMatrix();
  this.renderer
      .resize()
      .clear()
      .setStamp(this.triangleStamp)
      .setColorVector(this.vec4)
      .setModelMatrix(this.mat44)
      .drawStamp();
};