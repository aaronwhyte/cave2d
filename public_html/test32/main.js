function main() {
  var test32 = new Test32();
}

function Test32() {
  this.canvas = document.querySelector('#canvas');
  this.viewMatrix = new Matrix44();
  this.vec4 = new Vec4();
  this.warpVec4 = new Vec4();
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

Test32.VISIBLE_WORLD = 8;
Test32.GRID_RAD = 2;

Test32.prototype.unlockIosSound = function() {
  if (!this.iosSoundUnlocked) {
    this.sfx.sound(0, 0, 0, 0.001, 0, 0, 0.001, 1, 1, 'sine');
    this.iosSoundUnlocked = true;
  }
};

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
  var model = RigidModel.createRingMesh(6, 0.5);
  this.triangleStamp = model.createModelStamp(this.renderer.gl);
};

Test32.prototype.loop = function() {
  this.renderer.resize().clear();
  this.draw();
  requestAnimationFrame(this.loopFn, this.canvas);
};

Test32.prototype.updateViewMatrix = function() {
  // set view matrix
  var time = Date.now() / 2000;
  var scale = 2 * this.canvas.width * this.canvas.height / (this.canvas.width + this.canvas.height);
  this.viewMatrix.toScaleOpXYZ(
          scale / (Test32.VISIBLE_WORLD * canvas.width),
          scale / (Test32.VISIBLE_WORLD * canvas.height),
          1);
//      .multiply(this.mat44.toTranslateOpXYZ(
//              Test32.GRID_RAD * Math.sin(time),
//              Test32.GRID_RAD * Math.cos(time*0.71),
//          0));
  this.renderer.setViewMatrix(this.viewMatrix);

  this.renderer.setWarps(
      [1, 1, 2, 0, 0, 0, 0, 0],
      [
        -4, -4, 8.5+8*Math.sin(5*time), 0.1,
        4, 4, 4, 0.5+0.4*Math.sin(10*time),

        Test32.GRID_RAD * Math.sin(2.5*time) * 2,
        -Test32.GRID_RAD * Math.sin(2.5*time) * 2,
        3, 2.17 + Math.sin(5*time),

        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
      ]
  );
};

Test32.prototype.draw = function() {
  this.updateViewMatrix();
  var time = Date.now() / 4000;
  this.renderer
      .resize()
//      .clearColor(Math.sin(time)/2+0.5, Math.sin(0.9*time+2*Math.PI/3)/2+0.5, Math.sin(0.8*time-2*Math.PI/3)/2+0.5, 1.0)
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