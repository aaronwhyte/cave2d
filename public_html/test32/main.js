function main() {
  var test32 = new Test32(document.querySelector('#canvas'));
  test32.start();
}

function Test32(canvas) {
  this.canvas = canvas;
  this.viewMatrix = new Matrix44();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.iosSoundUnlocked = false;
}

Test32.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

Test32.prototype.start = function() {
  new RendererLoader(this.canvas, 'vertex-shader.txt', 'fragment-shader.txt')
      .load(this.onRendererLoaded.bind(this));
  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);

  // on-event sound unlocker for iOS
  document.body.addEventListener('mousedown', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchstart', this.unlockIosSound.bind(this));
  document.body.addEventListener('mouseup', this.unlockIosSound.bind(this));
  document.body.addEventListener('touchend', this.unlockIosSound.bind(this));

  this.loopFn = this.loop.bind(this);
};

Test32.VISIBLE_WORLD = 12;
Test32.GRID_RAD = 4;

Test32.prototype.onRendererLoaded = function(r) {
  this.renderer = r;
  this.renderer.createUniform('uWarpType');
  this.renderer.createUniform('uWarpData');
  this.renderer.setWarps = function(type, data) {
    this.gl.uniform1iv(this.uWarpType, type);
    this.gl.uniform4fv(this.uWarpData, data);
  };
  this.renderer.clearColor(0.5, 0.5, 0.5, 1.0);
  this.initStamps();
  this.loop();
};

Test32.prototype.initStamps = function() {
  var model = RigidModel.createRingMesh(5, 0.5);
  this.triangleStamp = model.createModelStamp(this.renderer.gl);
};

Test32.prototype.loop = function() {
  this.renderer.resize().clear();
  this.draw();
  requestAnimationFrame(this.loopFn, this.canvas);
};

Test32.prototype.updateViewMatrix = function() {
  // set view matrix
  var scale = 2 * this.canvas.width * this.canvas.height / (this.canvas.width + this.canvas.height);
  this.viewMatrix.toScaleOpXYZ(
          scale / (Test32.VISIBLE_WORLD * canvas.width),
          scale / (Test32.VISIBLE_WORLD * canvas.height),
          1)
      .multiply(this.mat44.toRotateZOp(0.25 * Math.sin(Date.now()/1000)))
  ;
  this.renderer.setViewMatrix(this.viewMatrix);
};

Test32.prototype.updateWarps = function() {
  var time = Date.now() / 3000;// + Math.sin(Date.now() / 3000)*Math.sin(Date.now() / 3000);
  var maxRepulsorRad = 7;
  var repulsorProgress = ((time*4) % 2) / 2;
  repulsorProgress = repulsorProgress > 1 ? 0 : repulsorProgress;
  var repulsorRad = Math.sqrt(maxRepulsorRad * maxRepulsorRad * Math.sin(repulsorProgress * Math.PI));
  var repulsorStrength = (1 - repulsorProgress) * (0.8 - repulsorProgress);

  var flowerMag = 5;
  var flowerAngle = -time * 2;

  this.renderer.setWarps(
      [1, 2, 3, 1, 0, 0, 0, 0],
      [
          // explodey-repulsor
          -5 + 5 * Math.sin(time*1.2),
          -5 + 5 * Math.sin(time*1.3),
          repulsorRad,
          repulsorStrength,

          // quantizer
          -5 + 5 * Math.sin(time),
          5 + 5 * Math.cos(time),
          6,
          4 + 2 * Math.sin(time*2),

          // flower
          5 + 4 * Math.sin(time*1.9),
          -5 + 4 * Math.cos(time*1.1),
          flowerMag*Math.sin(flowerAngle),
          flowerMag*Math.cos(flowerAngle),

          // vacuum repulsor
          5 + 3*Math.sin(time),
          5 + 3*Math.cos(time * 1.123),
          5,
          2 * (Math.sin(time*10) - 0.95),

          0, 0, 0, 0,
          0, 0, 0, 0,
          0, 0, 0, 0
      ]
  );
};

Test32.prototype.draw = function() {
  this.updateViewMatrix();
  this.updateWarps();
  this.renderer
      .resize()
      .clear()
      .setStamp(this.triangleStamp);
  for (var y = -Test32.GRID_RAD; y <= Test32.GRID_RAD; y++) {
    for (var x = -Test32.GRID_RAD; x <= Test32.GRID_RAD; x++) {
      this.renderer.setModelMatrix(this.mat44.toTranslateOpXYZ(
              x*2.5,
              y*2.5,
              0));
      this.renderer.setColorVector(this.vec4.setXYZ(Math.sin(y)/2+0.5 , Math.cos(x)/2+0.5, Math.sin(x*y)/2+0.5));
      this.renderer.drawStamp();
    }
  }
};