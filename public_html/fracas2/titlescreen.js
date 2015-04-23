/**
 * @constructor
 */
function TitleScreen(main, canvas, renderer, audio) {
  this.main = main;
  this.canvas = canvas;
  this.renderer = renderer;
  this.audio = audio;

  // 0 to 1
  this.visibility = 0;
  this.goalVisibility = 0;

  this.loopCallback = this.loop.bind(this);

  var glyphs = new Glyphs(new GlyphMaker(0.6, 10));
  glyphs.initStamps(this.renderer.gl);
  this.printer = new Printer(renderer, glyphs.stamps);

  this.vec4 = new Vec4();
  this.mat4 = new Matrix44();

  this.viewMatrix = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelColor = new Vec4();

  this.startMatrix = new Matrix44()
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(-0.6, 0, 0)))
      .multiply(this.mat4.toScaleOp(this.vec4.setXYZ(0.05, 0.05, 0.05)))
      .multiply(this.mat4.toRotateXOp(Math.PI * 0.25))
  ;
//      .multiply(this.mat4.toRotateXOp(0.1));
  this.nextCharMatrix = new Matrix44()
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(3.1, 0, 0)));
}

TitleScreen.ZOOM = 1;

TitleScreen.VISIBILITY_PER_MS = 5 / 1000;

TitleScreen.prototype.appear = function() {
  console.log("TitleScreen.appear");
  this.goalVisibility = 1;
  if (this.visibility == 1) {
    console.log("TitleScreen.appear - already 100% visible");
    return;
  }
  this.lastFrameTime = Date.now();
  requestAnimationFrame(this.loopCallback, this.canvas);
};

TitleScreen.prototype.disappear = function() {
  console.log("TitleScreen.disappear");
  requestAnimationFrame(this.loopCallback, this.canvas);
  this.goalVisibility = 0;
};

TitleScreen.prototype.loop = function() {
  var now = Date.now();
  var elapsedMs = now - this.lastFrameTime;
  this.lastFrameTime = now;

  if (this.visibility != this.goalVisibility) {
    var maxDistThisFrame = elapsedMs * TitleScreen.VISIBILITY_PER_MS;
    var distToGoal = this.goalVisibility - this.visibility;
    if (Math.abs(distToGoal) <= maxDistThisFrame) {
      this.visibility = this.goalVisibility;
      if (this.visibility == 1) {
        this.finishAppearing();
      } else if (this.visibility == 0) {
        this.finishDisappearing();
        // Do not continue looping.
        return;
      }
    } else {
      this.visibility += Math.sign(distToGoal) * maxDistThisFrame;
    }
  }
  this.draw();
  requestAnimationFrame(this.loopCallback, this.canvas);
};

TitleScreen.prototype.finishAppearing = function() {
  console.log("TitleScreen.finishAppearing");
};

TitleScreen.prototype.finishDisappearing = function() {
  console.log("TitleScreen.finishDisappearing");
};

TitleScreen.prototype.draw = function() {
  this.renderer.resize().clear();
  var t = Date.now();

  // set view matrix
  var edge = Math.min(this.canvas.width, this.canvas.height);
  this.vec4.setXYZ(
          edge / (TitleScreen.ZOOM * this.canvas.width) + Math.sin(t / 720) * 0.1,
          edge / (TitleScreen.ZOOM * this.canvas.height) + Math.sin(t / 720) * 0.1,
      Math.sin(t / 720) * 3);
  this.viewMatrix.toScaleOp(this.vec4);
//  this.viewMatrix.multiply(this.mat4.toRotateXOp(Math.sin(t / 720) * 0.5));

  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setColorVector(this.modelColor.setXYZ(0.1, 0.7, 0.3));
  this.printer.printLine(this.startMatrix, this.nextCharMatrix, 'FRACAS II');
//  this.renderer.drawText("FRACAS 2", 0, 0);
};

