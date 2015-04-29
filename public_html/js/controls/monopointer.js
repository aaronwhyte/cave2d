/**
 * Dumb pollable single pointer, blending mouse and touch on a canvas. Maybe arrow keys too?
 * @constructor
 */
function MonoPointer() {
  this.down = false;
  this.pos = new Vec2d();

  var self = this;

  this.mouseDownListener = function(e) {
    self.onMouseDown(e);
  };
  this.mouseMoveListener = function(e) {
    self.onMouseMove(e);
  };
  this.mouseUpListener = function(e) {
    self.onMouseUp(e);
  };

}

MonoPointer.prototype.startListening = function() {
  document.body.addEventListener('mousedown', this.mouseDownListener);
  document.body.addEventListener('mousemove', this.mouseMoveListener);
  document.body.addEventListener('mouseup', this.mouseUpListener);
  this.listening = true;
  return this;
};

MonoPointer.prototype.stopListening = function() {
  document.body.removeEventListener('mousedown', this.mouseDownListener);
  document.body.removeEventListener('mousemove', this.mouseMoveListener);
  document.body.removeEventListener('mouseup', this.mouseUpListener);
  this.listening = false;
  return this;
};

MonoPointer.prototype.onMouseDown = function(e) {
  this.down = true;
  this.pos.setXY(e.clientX, e.clientY);
};

MonoPointer.prototype.onMouseMove = function(e) {
  this.pos.setXY(e.clientX, e.clientY);
};

MonoPointer.prototype.onMouseUp = function(e) {
  this.down = false;
  this.pos.setXY(e.clientX, e.clientY);
};

