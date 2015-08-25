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
  this.vec4 = new Vec4();
  this.mat4 = new Matrix44();
  this.multiPointer = new MultiPointer(this.canvas, this.viewMatrix, false);
  this.readyToDraw = false;
  this.nextButtonNum = 0;
  this.worldBoundingRect = new Rect();

  this.lastPathRefreshTime = -Infinity;
  this.visibility = 0;
  this.listening = false;
  this.spacebarFn = this.getSpacebarFn();
  this.multiPointerLockFn = this.getMultiPointerLockFn();
  this.fullscrnFn = this.getFullscrnFn();
  this.pauseFn = this.getPauseFn();
  this.quitFn = this.getQuitFn();
}
BaseScreen.prototype = new Screen();
BaseScreen.prototype.constructor = BaseScreen;

BaseScreen.prototype.setSpaceButtonSpirit = function(s) {
  this.spaceButtonSpirit = s;
};

/** Usually "Play" and "Resume" trigger pointer-lock. */
BaseScreen.prototype.setPointerLockButtonSpirit = function(s) {
  this.pointerLockButtonSpirit = s;
};

BaseScreen.prototype.setFullScrnButtonSpirit = function(s) {
  this.fullScrnButtonSpirit = s;
};

BaseScreen.prototype.getSpacebarFn = function() {
  var self = this;
  return function(e) {
    // space is keyCode 32
    if (e.keyCode == 32 && self.spaceButtonSpirit) {
      self.spaceButtonSpirit.onClick(null);
    }
  };
};

BaseScreen.prototype.getMultiPointerLockFn = function() {
  var self = this;
  return function(pointerEvent) {
    if (self.pointerLockButtonSpirit) {
      self.pointerLockButtonSpirit.processPointerEvent(self.world, self.renderer, pointerEvent);
    }
  };
};

BaseScreen.prototype.getFullscrnFn = function() {
  var self = this;
  return function(pointerEvent) {
    if (self.fullScrnButtonSpirit) {
      self.fullScrnButtonSpirit.processPointerEvent(self.world, self.renderer, pointerEvent);
    }
  }
};

BaseScreen.prototype.getPauseFn = function() {
  var self = this;
  return function(pointerEvent) {
    if (self.pauseButtonSpirit) {
      self.pauseButtonSpirit.processPointerEvent(self.world, self.renderer, pointerEvent);
    }
  }
};

BaseScreen.prototype.getQuitFn = function() {
  var self = this;
  return function(pointerEvent) {
    if (self.quitButtonSpirit) {
      self.quitButtonSpirit.processPointerEvent(self.world, self.renderer, pointerEvent);
    }
  }
};

BaseScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  if (listen) {
    this.multiPointer.startListening();
    document.body.addEventListener('keydown', this.spacebarFn);
    this.multiPointer.addListener(this.multiPointerLockFn);
    this.multiPointer.addListener(this.fullscrnFn);
    this.multiPointer.addListener(this.pauseFn);
    this.multiPointer.addListener(this.quitFn);
  } else {
    this.multiPointer.stopListening();
    document.body.removeEventListener('keydown', this.spacebarFn);
    this.multiPointer.removeListener(this.multiPointerLockFn);
    this.multiPointer.removeListener(this.fullscrnFn);
    this.multiPointer.removeListener(this.pauseFn);
    this.multiPointer.removeListener(this.quitFn);
  }
  this.listening = listen;
};

BaseScreen.prototype.drawScreen = function(visibility) {
  this.visibility = visibility;
  if (!this.readyToDraw) {
    this.initWorld();
    this.readyToDraw = true;
  }
  if (this.visibility == 1) {
    this.clock();
  }
  this.updateViewMatrix(Date.now());
  this.drawScene();
  this.multiPointer.clearEventQueue();
  this.multiPointer.setViewMatrix(this.viewMatrix);
};

BaseScreen.prototype.drawScene = function() {
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
};


BaseScreen.prototype.destroyScreen = function() {
  // Unload button models? Need a nice utility for loading, remembering, and unloading models.
};

BaseScreen.prototype.clock = function() {
  var endTimeMs = Date.now() + MS_PER_FRAME;
  var endClock = this.world.now + CLOCKS_PER_FRAME;

  if (this.handleInput) {
    this.handleInput();
  }

  if (this.lastPathRefreshTime + PATH_DURATION <= endClock) {
    this.lastPathRefreshTime = this.world.now;
    for (var id in this.world.bodies) {
      var b = this.world.bodies[id];
      if (b && b.pathDurationMax > PATH_DURATION) {
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
