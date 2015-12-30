/**
 * Mouse pointer wrapped in my silly start/stopListening & pubsub & queueing stuff.
 * Each frame it provides before and after snapshots, in world coordinates.
 *
 * If queueing is on, it provides a log of all events since the last clearEventQueue().
 * When queueing is on, be sure to call clearEventQueue() after handling event data,
 * before waiting for the next animation frame, because events only arrive when no other JS is running.
 * @param canvas  used to map mouse coords to world coords
 * @param {Matrix44} viewMatrix  from world to clipspace, also used to map mousecoords to world coords
 * @param {boolean} queueing  true if this should retain a log of all events that happened between frames.
 *
 * @constructor
 */
function MousePointer(canvas, viewMatrix, queueing) {
  this.canvas = canvas;
  this.inverseViewMatrix = new Matrix44();
  this.oldViewMatrix = new Matrix44();
  this.setViewMatrix(viewMatrix);

  this.eventCoords = new Vec2d();
  this.oldPosition = new Vec2d();
  this.position = new Vec2d();

  // Queue of PointerEvent objects. There are usually only a few per frame,
  // so 100 is grossly overkill, I hope.
  this.queue = queueing ? new CircularQueue(100) : null;

  this.mat44 = new Matrix44;
  this.vec4 = new Vec4();
  this.canvasToClip = new Matrix44();

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

  this.domEventListeners = new ArraySet();

  this.listening = false;
}

MousePointer.MOUSE_ID = 'mouse';

MousePointer.prototype.startListening = function() {
  if (!this.listening) {
    document.body.addEventListener('mousedown', this.mouseDownListener);
    document.body.addEventListener('mousemove', this.mouseMoveListener);
    document.body.addEventListener('mouseup', this.mouseUpListener);
    this.listening = true;
  }
  return this;
};

MousePointer.prototype.stopListening = function() {
  if (this.listening) {
    document.body.removeEventListener('mousedown', this.mouseDownListener);
    document.body.removeEventListener('mousemove', this.mouseMoveListener);
    document.body.removeEventListener('mouseup', this.mouseUpListener);
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

/**
 * Adds a function that will be called as part of the read DOM event handler stack,
 * so it will be able to do things like toggle fullscreen or pointer events.
 * The function will be called with a PointerEvent, the same one that gets added to
 * the internal queue.
 * @param {Function} fn
 */
MousePointer.prototype.addListener = function(fn) {
  this.domEventListeners.put(fn);
};

/**
 * @param {Function} fn
 */
MousePointer.prototype.removeListener = function(fn) {
  this.domEventListeners.remove(fn);
};

MousePointer.prototype.getQueueSize = function() {
  return this.queue ? this.queue.size() : 0;
};

/**
 * @param index Zero is the oldest event, and getQueueSize-1 is the newest.
 * @returns {PointerEvent}
 */
MousePointer.prototype.getPointerEventFromTail = function(index) {
  return this.queue.getFromTail(index);
};

MousePointer.prototype.setViewMatrix = function(viewMatrix) {
  if (this.oldViewMatrix.equals(viewMatrix)) return;
  this.oldViewMatrix.set(viewMatrix);
  viewMatrix.getInverse(this.inverseViewMatrix);
  if (!this.listening) return;

  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_MOVE;
  e.pointerId = MousePointer.MOUSE_ID;
  e.time = Date.now();
  e.pos.set(this.eventCoords);
  this.transformCanvasToWorld(e.pos);
  this.enqueue(e);

  this.position.set(e.pos);
};

/**
 * Flips the old and new position snapshots, and clears the queue
 */
MousePointer.prototype.clearEventQueue = function() {
  if (!this.queue) return;
  this.oldPosition.set(this.position);
  while (!this.queue.isEmpty()) {
    this.queue.dequeue();
  }
};

MousePointer.prototype.isPointerLocked = function() {
  return document.pointerLockElement ||
         document.mozPointerLockElement ||
         document.webkitPointerLockElement;
};

MousePointer.prototype.onMouseDown = function(e) {
  if (!this.isPointerLocked()) {
    this.down(e.clientX, e.clientY);
  }
};

MousePointer.prototype.onMouseMove = function(e) {
  this.move(e.clientX, e.clientY);
};

MousePointer.prototype.onMouseUp = function(e) {
  this.up(e.clientX, e.clientY);
};

MousePointer.prototype.down = function(x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_DOWN;
  e.pointerId = MousePointer.MOUSE_ID;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.transformCanvasToWorld(e.pos);
  this.enqueue(e);

  this.position.set(e.pos);
  this.eventCoords.setXY(x, y);

  this.callListeners(e);
};

MousePointer.prototype.move = function(x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_MOVE;
  e.pointerId = MousePointer.MOUSE_ID;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.transformCanvasToWorld(e.pos);
  this.enqueue(e);

  this.position.set(e.pos);
  this.eventCoords.setXY(x, y);

  this.callListeners(e);
};

MousePointer.prototype.enqueue = function(e) {
  if (this.queue) {
    this.queue.enqueue(e);
  }
};

MousePointer.prototype.up = function(x, y) {
  var e = PointerEvent.alloc();
  e.type = PointerEvent.TYPE_UP;
  e.pointerId = MousePointer.MOUSE_ID;
  e.time = Date.now();
  e.pos.setXY(x, y);
  this.transformCanvasToWorld(e.pos);
  this.enqueue(e);

  this.position.set(e.pos);
  this.eventCoords.setXY(x, y);

  this.callListeners(e);
};

MousePointer.prototype.callListeners = function(e) {
  var listeners = this.domEventListeners.vals;
  for (var i = 0; i < listeners.length; i++) {
    listeners[i](e);
  }
};

/**
 * Transforms a vec2d in place using this current matrix44
 * @param {Vec2d} vec2d
 * @returns {Vec2d}
 */
MousePointer.prototype.transformCanvasToWorld = function(vec2d) {
  this.vec4.setXYZ(vec2d.x, vec2d.y, 0);

  // canvas to clip
  this.canvasToClip.toIdentity();
  this.canvasToClip.multiply(this.mat44.toScaleOpXYZ(2 / this.canvas.width, -2 / this.canvas.height, 1));
  this.canvasToClip.multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width / 2, -this.canvas.height / 2, 0));
  this.vec4.transform(this.canvasToClip);

  // clip-space to world-space
  this.vec4.transform(this.inverseViewMatrix);

  vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
  return vec2d;
};
