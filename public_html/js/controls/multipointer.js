/**
 * Multiple pointer handler, blending mouse and touch on a canvas.
 * Each frame it provides before and after snapshots, and a
 * log of all the events in between.
 * Be sure to call clearEventQueue() after handling event data, and before waiting until the next frame,
 * because mouse and touch events only arrive when no other JS is running.
 * @constructor
 */
function MultiPointer(canvas, viewMatrix) {
  this.canvas = canvas;
  this.inverseViewMatrix = new Matrix44();
  this.setViewMatrix(viewMatrix);

  // Maps from IDs to Vec2d()s.
  this.eventCoords = {};
  this.oldPositions = {};
  this.positions = {};

  // Queue of PointerEvent objects. There are usually only a few per frame,
  // so 100 is grossly overkill, I hope.
  this.queue = new CircularQueue(100);

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

  this.listening = false;
}

MultiPointer.MOUSE_ID = 'mouse';

MultiPointer.prototype.startListening = function() {
  if (!this.listening) {
    document.body.addEventListener('mousedown', this.mouseDownListener);
    document.body.addEventListener('mousemove', this.mouseMoveListener);
    document.body.addEventListener('mouseup', this.mouseUpListener);
    document.body.addEventListener('touchstart', this.touchStartListener);
    document.body.addEventListener('touchmove', this.touchMoveListener);
    document.body.addEventListener('touchend', this.touchEndListener);
    document.body.addEventListener('touchcancel', this.touchEndListener);
    document.body.addEventListener('touchleave', this.touchEndListener);
    this.listening = true;
  }
  return this;
};

MultiPointer.prototype.stopListening = function() {
  if (this.listening) {
    document.body.removeEventListener('mousedown', this.mouseDownListener);
    document.body.removeEventListener('mousemove', this.mouseMoveListener);
    document.body.removeEventListener('mouseup', this.mouseUpListener);
    document.body.removeEventListener('touchstart', this.touchStartListener);
    document.body.removeEventListener('touchmove', this.touchMoveListener);
    document.body.removeEventListener('touchend', this.touchEndListener);
    document.body.removeEventListener('touchcancel', this.touchEndListener);
    document.body.removeEventListener('touchleave', this.touchEndListener);
    this.listening = false;
    this.clearEventQueue();
    for (var id in this.positions) {
      delete this.positions[id];
    }
    for (var id in this.oldPositions) {
      delete this.oldPositions[id];
    }
    for (var id in this.eventCoords) {
      delete this.eventCoords[id];
    }
  }
  return this;
};

MultiPointer.prototype.getQueueSize = function() {
  return this.queue.size();
};

/**
 * @param index Zero is the oldest event, and getQueueSize-1 is the newest.
 * @returns {PointerEvent}
 */
MultiPointer.prototype.getPointerEventFromTail = function(index) {
  return this.queue.getFromTail(index);
};

MultiPointer.prototype.setViewMatrix = function(viewMatrix) {
  viewMatrix.getInverse(this.inverseViewMatrix);
  if (!this.listening) return;

  // Effectively, every point has moved, so create a move event for them.
  for (var id in this.positions) {
    var e = PointerEvent.alloc();
    e.type = PointerEvent.TYPE_MOVE;
    e.pointerId = id;
    e.time = Date.now();
    e.pos.set(this.eventCoords[id]);
//    e.note = JSON.stringify(viewMatrix);
    this.transformCanvasToWorld(e.pos);
    this.queue.enqueue(e);

    this.positions[id].set(e.pos);
  }
};

/**
 * Flips the old and new position snapshots, and clears the queue
 */
MultiPointer.prototype.clearEventQueue = function() {
  // Delete obsolete oldPos entries
  for (var id in this.oldPositions) {
    if (!(id in this.positions)) {
      this.oldPositions[id].free();
      delete this.oldPositions[id];
    }
  }
  for (id in this.positions) {
    if (!(id in this.oldPositions)) {
      this.oldPositions[id] = Vec2d.alloc();
    }
    this.oldPositions[id].set(this.positions[id]);
  }
  while (!this.queue.isEmpty()) {
    this.queue.dequeue();
  }
};

MultiPointer.prototype.onMouseDown = function(e) {
  this.down(MultiPointer.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer.prototype.onMouseMove = function(e) {
  this.move(MultiPointer.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer.prototype.onMouseUp = function(e) {
  this.up(MultiPointer.MOUSE_ID, e.clientX, e.clientY);
};

MultiPointer.prototype.onTouchStart = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.down(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer.prototype.onTouchMove = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.move(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer.prototype.onTouchEnd = function(e) {
  var touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    var touch = touches[i];
    this.up(touch.identifier, touch.pageX, touch.pageY);
  }
};

MultiPointer.prototype.down = function(id, x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_DOWN;
  e.pointerId = id;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.transformCanvasToWorld(e.pos);
  this.queue.enqueue(e);

  if (!(id in this.positions)) {
    this.positions[id] = Vec2d.alloc();
  }
  this.positions[id].set(e.pos);

  if (!(id in this.eventCoords)) {
    this.eventCoords[id] = Vec2d.alloc();
  }
  this.eventCoords[id].setXY(x, y);
};

MultiPointer.prototype.move = function(id, x, y) {
  if (id in this.positions) {
    var e = PointerEvent.alloc();
    e.type = PointerEvent.TYPE_MOVE;
    e.pointerId = id;
    e.time = Date.now();
    e.pos.setXY(x, y);
    this.transformCanvasToWorld(e.pos);
    this.queue.enqueue(e);

    this.positions[id].set(e.pos);
    this.eventCoords[id].setXY(x, y);
  }
};

MultiPointer.prototype.up = function(id, x, y) {
  if (id in this.positions) {
    var e = PointerEvent.alloc();
    e.type = PointerEvent.TYPE_UP;
    e.pointerId = id;
    e.time = Date.now();
    e.pos.setXY(x, y);
    this.transformCanvasToWorld(e.pos);
    this.queue.enqueue(e);

    this.positions[id].free();
    delete this.positions[id];

    this.eventCoords[id].free();
    delete this.eventCoords[id];
  }
};

/**
 * Transforms a vec2d in place using this current matrix44
 * @param {Vec2d} vec2d
 * @returns {Vec2d}
 */
MultiPointer.prototype.transformCanvasToWorld = function(vec2d) {
  // canvas to clip
  this.canvasToClip.toScaleOpXYZ(2 / this.canvas.width, -2 / this.canvas.height, 1);
  this.canvasToClip.multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width / 2, -this.canvas.height / 2, 0));
  this.vec4.setXYZ(vec2d.x, vec2d.y, 0).transform(this.canvasToClip);

  // clip to world
  this.vec4.transform(this.inverseViewMatrix);

  vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
  return vec2d;
};
