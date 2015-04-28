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

  var glyphs = new Glyphs(new GlyphMaker(0.5, 3));
  glyphs.initStamps(this.renderer.gl);
  this.printer = new Printer(renderer, glyphs.stamps);

  this.vec4 = new Vec4();
  this.mat4 = new Matrix44();

  this.viewMatrix = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.modelColor = new Vec4();

  // to center text, shift by (length-1)/2 * next-char spacing (3)
  this.startMatrix = new Matrix44()
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(0, 0.5, 0)))
      .multiply(this.mat4.toScaleOp(this.vec4.setXYZ(0.07, 0.07, 0.07)))
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(-(9-1)/2 * 3, 0, 0)))
  ;

// FRACAS II
//     ^
//      .multiply(this.mat4.toRotateXOp(0.1));
  this.nextCharMatrix = new Matrix44()
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(3.0, 0, 0)));
}

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
          edge / this.canvas.width,
          edge / this.canvas.height,
          1);
  this.viewMatrix.toScaleOp(this.vec4)
      .multiply(this.mat4.toScaleOp(this.vec4.setXYZ(1, 1, 0.4)))
      .multiply(this.mat4.toTranslateOp(this.vec4.setXYZ(0, 0, -0.1)))
      .multiply(this.mat4.toRotateYOp(Math.sin(t / 500) * Math.PI / 2 * 0.1))
      .multiply(this.mat4.toRotateXOp(-Math.PI * 0.2 * 0.75))
  ;

  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setColorVector(this.modelColor.setXYZ(0.1, 1, 0.3));
  this.printer.printLine(this.startMatrix, this.nextCharMatrix, 'FRACAS II');
//  this.renderer.drawText("FRACAS 2", 0, 0);
};

