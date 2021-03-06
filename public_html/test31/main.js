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
  document.body.addEventListener('mouseup', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchend', this.unlockIosSound.bind(this));

  this.loopFn = this.loop.bind(this);
}

Test31.VISIBLE_WORLD = 6;

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
  var model = RigidModel.createRingMesh(6, 0.5);
//  var model = RigidModel.createSquare();
//  for (var i = 0; i < 6; i++) {
//    model = model.createQuadrupleTriangleModel();
//  }

//  for (var i = 0, n = model.vertexes.length; i < n; i++) {
//    var c = 1-0.7*model.vertexes[i].position.magnitudeSquared();
//    model.vertexes[i].setColorRGB(c, c, c);
//  }
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
      .setStamp(this.triangleStamp);

  var gridRad = 5;
  for (var y = -gridRad; y <= gridRad; y++) {
    for (var x = -gridRad; x <= gridRad; x++) {
      var time = Date.now() / 2000;
      this.renderer.setModelMatrix(this.mat44.toTranslateOpXYZ(
              x*2.5 + 3*gridRad * Math.sin(time),
              y*2.5 + 3*gridRad * Math.cos(time*0.71),
              0));
      this.renderer.setColorVector(this.vec4.setXYZ(Math.sin(y)/2+0.5 , Math.cos(x)/2+0.5, Math.sin(x*y)/2+0.5));
      this.renderer.drawStamp();
    }
  }
};