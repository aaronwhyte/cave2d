/**
 * Corresponds roughly to a single human game player.
 *
 * @constructor
 */
function Player() {
  // map of ID to spirit
  this.spirits = {};
  this.vec = new Vec2d();
  this.buttonRad = -1;
  this.canvasWidth = -1;
  this.canvasHeight = -1;
}

Player.prototype.setControls = function(trackball, b1, b2) {
  this.trackball = trackball;
  this.b1 = b1;
  this.b2 = b2;
};

Player.prototype.handleInput = function() {
  var tx = 0, ty = 0, tt = false;
  if (this.trackball) {
    this.trackball.getVal(this.vec);
    tx = this.vec.x;
    ty = this.vec.y;
    tt = this.trackball.isTouched();
    this.trackball.reset();
  }
  var b1 = this.b1 ? this.b1.getVal() : false;
  var b2 = this.b2 ? this.b2.getVal() : false;
  for (var id in this.spirits) {
    this.spirits[id].handleInput(tx, ty, tt, b1, b2);
  }
};

Player.prototype.setKeyboardTipTimeoutMs = function(ms) {
  if (this.b1) this.b1.setKeyboardTipTimeoutMs(ms);
  if (this.b2) this.b2.setKeyboardTipTimeoutMs(ms);
};

Player.prototype.drawHud = function(renderer) {
  var diameter = Math.min(renderer.canvas.width / 4, (renderer.canvas.width / 6 + renderer.canvas.height / 6)/2, 150);
  var r = diameter / 2;
  if (r != this.buttonRad ||
      renderer.canvas.width != this.canvasWidth ||
      renderer.canvas.height != this.canvasHeight) {
    this.buttonRad = r;
    this.canvasWidth = renderer.canvas.width;
    this.canvasHeight = renderer.canvas.height;
    if (this.b1) {
      this.b1
          .setCanvasPositionXY(r*1.1, renderer.canvas.height - 2.5 * r)
          .setCanvasScaleXY(r, -r)
          .setKeyboardTipScaleXY(r/4, -r/4);
    }
    if (this.b2) {
      this.b2
          .setCanvasPositionXY(r * 3, renderer.canvas.height - r*1.1)
          .setCanvasScaleXY(r, -r)
          .setKeyboardTipScaleXY(r/4, -r/4);
    }
  }
  if (this.b1) {
    this.b1.draw(renderer);
  }
  if (this.b2) {
    this.b2.draw(renderer);
  }
};

Player.prototype.addSpirit = function(s) {
  this.spirits[s.id] = s;
};

Player.prototype.removeSpiritId = function(id) {
  delete this.spirits[id];
};

Player.prototype.removeAllSpirits = function() {
  for (var id in this.spirits) {
    delete this.spirits[id];
  }
};
