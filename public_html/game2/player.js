/**
 * Corresponds roughly to a single human game player.
 *
 * @constructor
 */
function Player() {
  // map of ID to spirit
  this.spirits = {};
  this.vec = new Vec2d();
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
