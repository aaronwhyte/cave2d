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

Player.prototype.setControls = function(trackball, b1, b2, pauseBtn) {
  function setKeyCuboidRule(widget) {
    if (!widget) return;
    widget.getKeyboardTipRule()
        .setSizingMax(keySizeRad, Vec4.INFINITY)
        .setSourceAnchor(Vec4.ZERO, Vec4.ZERO)
        .setTargetAnchor(Vec4.ZERO, Vec4.ZERO);
  }
  this.trackball = trackball;
  var keySizeRad = new Vec4(0.25, 0.25, 1);
  this.b1 = b1;
  setKeyCuboidRule(b1);
  this.b2 = b2;
  setKeyCuboidRule(b2);
  this.pauseBtn = pauseBtn;
};

Player.prototype.handleInput = function() {
  var tx = 0, ty = 0, tTouched = false;
  if (this.trackball) {
    this.trackball.getVal(this.vec);
    tx = this.vec.x;
    ty = this.vec.y;
    tTouched = this.trackball.isTouched();
    this.trackball.reset();
  }
  var b1 = this.b1 ? this.b1.getVal() : false;
  var b2 = this.b2 ? this.b2.getVal() : false;
  var tContrib = this.trackball.getContrib();
  for (var id in this.spirits) {
    this.spirits[id].handleInput(tx, ty, tTouched, tContrib, b1, b2);
  }
};

Player.prototype.setKeyboardTipTimeoutMs = function(ms) {
  if (this.b1) this.b1.setKeyboardTipTimeoutMs(ms);
  if (this.b2) this.b2.setKeyboardTipTimeoutMs(ms);
  if (this.pauseBtn) this.pauseBtn.setKeyboardTipTimeoutMs(ms);
};

Player.prototype.drawHud = function(renderer) {
  // The smaller of a quarter of the width (for portriat mode),
  // or a sixth of the average of width and height (usually the smallest value, for consistency when rotated)
  // or 120 (to keep the size reasonable on large screens)
  var diameter = Math.min(renderer.canvas.width / 4, (renderer.canvas.width + renderer.canvas.height) / 12, 120);
  var r = diameter / 2;
  if (r != this.buttonRad ||
      renderer.canvas.width != this.canvasWidth ||
      renderer.canvas.height != this.canvasHeight) {
    // Something changed so do a re-layout.
    this.buttonRad = r;
    this.canvasWidth = renderer.canvas.width;
    this.canvasHeight = renderer.canvas.height;
    if (this.b1) {
      this.b1.getWidgetCuboid()
          .setPosXYZ(r * 1.1, renderer.canvas.height - r * 2.1, 0)
          .setRadXYZ(r, r, 0);
    }
    if (this.b2) {
      this.b2.getWidgetCuboid()
          .setPosXYZ(r * 3.3, renderer.canvas.height - r * 1.1, 0)
          .setRadXYZ(r, r, 0);
    }
    if (this.pauseBtn) {
      this.pauseBtn.getWidgetCuboid()
          .setPosXYZ(r * 0.1 + r * 0.4, renderer.canvas.height - r * 3.9, 0)
          .setRadXYZ(r * 0.4, r * 0.4, 0);
    }
  }
  if (this.b1) {
    this.b1.draw(renderer);
  }
  if (this.b2) {
    this.b2.draw(renderer);
  }
  if (this.pauseBtn) {
    this.pauseBtn.draw(renderer);
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
