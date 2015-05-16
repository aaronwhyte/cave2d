/**
 * Dumb pollable multiple pointer, blending mouse and touch on a canvas.
 * @constructor
 */
function MultiPointer(canvas, viewMatrix) {
  this.canvas = canvas;
  this.inverseViewMatrix = new Matrix44();
  this.calcInverseViewMatrix(viewMatrix);

  // Maps from IDs to Vec2d()s.
  this.oldPos = {};
  this.pos = {};

  this.mat44 = new Matrix44;
  this.vec4 = new Vec4();
  this.canvasToClip = new Matrix44();

  var self = this;

  this.touchStartListener = function(e) {
    self.onTouchStart(e);
  };
  this.touchMoveListener = function(e) {
    self.onTouchMove(e);
  };
  this.touchEndListener = function(e) {
    self.onTouchEnd(e);
  };
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

MultiPointer.MOUSE_ID = 'mouse';

// Weak - better if I could use "half an inch" or something.
MultiPointer.TOUCH_Y_OFFSET = -60;

MultiPointer.prototype.startListening = function() {
  document.body.addEventListener('mousedown', this.mouseDownListener);
  document.body.addEventListener('mousemove', this.mouseMoveListener);
  document.body.addEventListener('mouseup', this.mouseUpListener);
  document.body.addEventListener('touchstart', this.touchStartListener);
  document.body.addEventListener('touchmove', this.touchMoveListener);
  document.body.addEventListener('touchend', this.touchEndListener);
  document.body.addEventListener('touchcancel', this.touchEndListener);
  this.listening = true;
  return this;
};

MultiPointer.prototype.stopListening = function() {
  document.body.removeEventListener('mousedown', this.mouseDownListener);
  document.body.removeEventListener('mousemove', this.mouseMoveListener);
  document.body.removeEventListener('mouseup', this.mouseUpListener);
  document.body.removeEventListener('touchstart', this.touchStartListener);
  document.body.removeEventListener('touchmove', this.touchMoveListener);
  document.body.removeEventListener('touchend', this.touchEndListener);
  document.body.removeEventListener('touchcancel', this.touchEndListener);
  this.listening = false;
  return this;
};

MultiPointer.prototype.calcInverseViewMatrix = function(viewMatrix) {
  viewMatrix.getInverse(this.inverseViewMatrix);
};

MultiPointer.prototype.saveOldPos = function() {
  // Delete obsolete oldPos entries
  for (var id in this.oldPos) {
    if (!this.pos[id]) {
      this.oldPos[id].free();
      delete this.oldPos[id];
    }
  }
  for (var id in this.pos) {
    if (!this.oldPos[id]) {
      this.oldPos[id] = Vec2d.alloc();
    }
    this.oldPos[id].set(this.pos[id]);
  }
};

MultiPointer.prototype.onMouseDown = function(e) {
  this.down(MultiPointer.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer.prototype.onMouseMove = function(e) {
  this.move(MultiPointer.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer.prototype.onMouseUp = function(e) {
  this.up(MultiPointer.MOUSE_ID);
};

MultiPointer.prototype.onTouchStart = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.down(touch.identifier, touch.pageX, touch.pageY + MultiPointer.TOUCH_Y_OFFSET);
  }
};

MultiPointer.prototype.onTouchMove = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.move(touch.identifier, touch.pageX, touch.pageY + MultiPointer.TOUCH_Y_OFFSET);
  }
};

MultiPointer.prototype.onTouchEnd = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.up(touch.identifier);
  }
};

MultiPointer.prototype.down = function(id, x, y) {
  if (!this.pos[id]) {
    this.pos[id] = Vec2d.alloc();
  }
  this.pos[id].setXY(x, y);
  this.transformCanvasToWorld(this.pos[id]);
};

MultiPointer.prototype.move = function(id, x, y) {
  if (this.pos[id]) {
    this.pos[id].setXY(x, y);
    this.transformCanvasToWorld(this.pos[id]);
  }
};

MultiPointer.prototype.up = function(id) {
  if (this.pos[id]) {
    this.pos[id].free();
    delete this.pos[id];
  }
};

/**
 * Transforms a vec2d in place using this current matrix44
 * @param {Vec2d} vec2d
 * @returns {Vec2d}
 */
MultiPointer.prototype.transformCanvasToWorld = function(vec2d) {
  // canvas to clip
  this.canvasToClip.toScaleOpXYZ(2 / this.canvas.width, -2 / this.canvas.height, 0);
  this.canvasToClip.multiply(mat4.toTranslateOpXYZ(-canvas.width / 2, -canvas.height / 2, 0));
  this.vec4.setXYZ(vec2d.x, vec2d.y, 0).transform(this.canvasToClip);

  // clip to world
  this.vec4.transform(this.inverseViewMatrix);

  vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
  return vec2d;
};
