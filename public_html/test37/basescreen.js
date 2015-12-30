/**
 * @constructor
 * @extends {Screen}
 */
function BaseScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  Screen.call(this);
  this.controller = controller;
  this.canvas = canvas;
  this.renderer = renderer;
  this.glyphs = glyphs;
  this.stamps = stamps;
  this.sfx = sound;

  this.viewMatrix = new Matrix44();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
  this.listening = false;

  this.mouseDownFn = this.getMouseDownFn();
  this.touchStartFn = this.getTouchStartFn();
  this.resizeFn = this.getResizeFn();

  this.clipToWorldMatrix = new Matrix44();
  this.clipToWorldMatrixDirty = true;
  this.canvasToClipMatrix = new Matrix44();
  this.canvasToClipMatrixDirty = true;

  this.paused = false;
}
BaseScreen.prototype = new Screen();
BaseScreen.prototype.constructor = BaseScreen;

BaseScreen.MS_PER_FRAME = 1000 / 60;
BaseScreen.CLOCKS_PER_FRAME = 0.5;
BaseScreen.PATH_DURATION = 0xffff;

BaseScreen.prototype.onPointerDown = null;
BaseScreen.prototype.onPointerDown = null;

BaseScreen.prototype.getMouseDownFn = function() {
  var self = this;
  return function(e) {
    if (self.onPointerDown) {
      self.onPointerDown(e.pageX, e.pageY);
    }
  };
};

BaseScreen.prototype.getTouchStartFn = function() {
  var self = this;
  return function(e) {
    if (self.onPointerDown) {
      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];
        self.onPointerDown(touch.pageX, touch.pageY);
      }
    }
  };
};

BaseScreen.prototype.getResizeFn = function() {
  var self = this;
  return function() {
    self.controller.requestAnimation();
  }
};

BaseScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  if (listen) {
    this.canvas.addEventListener('mousedown', this.mouseDownFn);
    this.canvas.addEventListener('touchstart', this.touchStartFn);
    window.addEventListener('resize', this.resizeFn);
  } else {
    this.canvas.removeEventListener('mousedown', this.mouseDownFn);
    this.canvas.removeEventListener('touchstart', this.touchStartFn);
    window.removeEventListener('resize', this.resizeFn);
  }
  this.listening = listen;
};

BaseScreen.prototype.drawScreen = function(visibility) {
  this.visibility = visibility;
  this.lazyInit();
  this.updateViewMatrix();
  this.drawScene();
  this.canvasToClipMatrixDirty = true;
  this.clipToWorldMatrixDirty = true;
  if (this.visibility == 1) {
    this.clock();
  }
};

BaseScreen.prototype.getClipToWorldMatrix = function() {
  if (this.clipToWorldMatrixDirty) {
    this.viewMatrix.getInverse(this.clipToWorldMatrix);
    this.clipToWorldMatrixDirty = false;
  }
  return this.clipToWorldMatrix;
};

BaseScreen.prototype.drawScene = function() {
  var animationRequested = false;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    spirit.onDraw(this.world, this.renderer);
    if (!animationRequested && spirit.animating) {
      this.controller.requestAnimation();
      animationRequested = true;
    }
  }
};

BaseScreen.prototype.destroyScreen = function() {
  // Unload button models? Need a nice utility for loading, remembering, and unloading models.
};

BaseScreen.prototype.clock = function() {
  if (this.paused) return;
  var endTimeMs = Date.now() + BaseScreen.MS_PER_FRAME;
  var endClock = this.world.now + BaseScreen.CLOCKS_PER_FRAME;

  if (this.handleInput) {
    this.handleInput();
  }

  if (this.lastPathRefreshTime + BaseScreen.PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.pathDurationMax > BaseScreen.PATH_DURATION && b.pathDurationMax != Infinity) {
        b.invalidatePath();
        b.moveToTime(this.world.now);
      }
    }
  }

  var e = this.world.getNextEvent();
  // Stop if there are no more events to process, or we've moved the game clock far enough ahead
  // to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.

  while (e && e.time <= endClock && Date.now() <= endTimeMs) {
    this.world.processNextEvent();
    if (e.type == WorldEvent.TYPE_HIT) {
      this.onHitEvent(e);
    }
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};

BaseScreen.prototype.onHitEvent = function(e) {};
