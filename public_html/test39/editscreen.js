/**
 * @constructor
 * @extends {BaseScreen}
 */
function EditScreen(controller, canvas, renderer, stamps, sfx) {
  BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.editor.setKeyboardTipTimeoutMs(ms);
  };
}
EditScreen.prototype = new BaseScreen();
EditScreen.prototype.constructor = EditScreen;

EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

EditScreen.ANT_RAD = 0.8;

EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.stamps);
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t].menuItemConfig;
    if (c) {
      this.editor.addMenuItem(c.group, c.rank, c.itemName, c.model);
    }
  }
  for (var group = 0; group < this.editor.getMaxGroupNum(); group++) {
    this.editor.addMenuKeyboardShortcut(group, group + 1);
  }
  this.editor.getStamps();
};

EditScreen.prototype.updateHudLayout = function() {
  this.pauseTriggerWidget.setCanvasPositionXY(this.canvas.width - BaseScreen.WIDGET_RADIUS, BaseScreen.WIDGET_RADIUS);
  this.editor.updateHudLayout();
};

EditScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.pauseTriggerWidget.startListening();

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.keyTipRevealer);
    window.addEventListener('keydown', this.keyTipRevealer);

  } else {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }
    this.pauseTriggerWidget.stopListening();

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.keyTipRevealer);
    window.removeEventListener('keydown', this.keyTipRevealer);
  }
  this.listening = listen;
};

EditScreen.prototype.initWidgets = function() {
  var self = this;
  this.pauseTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.pauseDownFn)
      .setCanvasScaleXY(BaseScreen.WIDGET_RADIUS, BaseScreen.WIDGET_RADIUS)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName(Key.Name.SPACE)
      .setStamp(this.stamps.editorPauseStamp);
};

EditScreen.prototype.toJSON = function() {
  var json = {
    terrain: this.bitGrid.toJSON(),
    now: this.world.now,
    bodies: [],
    spirits: [],
    timeouts: [],
    splashes: [],
    cursorPos: this.editor.cursorPos.toJSON(),
    cameraPos: this.camera.cameraPos.toJSON()
  };
  // bodies
  for (var bodyId in this.world.bodies) {
    var body = this.world.bodies[bodyId];
    if (body.hitGroup != BaseScreen.Group.WALL) {
      // round velocity on save, to stop from saving tons of high-precision teeny tiny velocities
      this.vec2d.set(body.vel).roundToGrid(EditScreen.ROUND_VELOCITY_TO_NEAREST);
      body.setVelAtTime(this.vec2d, this.now());
      json.bodies.push(body.toJSON());
    }
  }
  // spirits
  for (var spiritId in this.world.spirits) {
    var spirit = this.world.spirits[spiritId];
    json.spirits.push(spirit.toJSON());
  }
  // timeouts
  for (var e = this.world.queue.getFirst(); e; e = e.next[0]) {
    if (e.type === WorldEvent.TYPE_TIMEOUT) {
      var spirit = this.world.spirits[e.spiritId];
      if (spirit) {
        json.timeouts.push(e.toJSON());
      }
    }
  }
  // splashes
  var splashes = this.splasher.splashes;
  for (var i = 0; i < splashes.length; i++) {
    json.splashes.push(splashes[i].toJSON());
  }
  return json;
};

EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 9.8, 1);
};

EditScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

EditScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.pauseTriggerWidget.draw(this.renderer);
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

EditScreen.prototype.configMousePointer = function() {
  if (this.pauseTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

EditScreen.prototype.getPauseTriggerColorVector = function() {
  this.colorVector.setRGBA(1, 1, 1, this.paused ? 0 : 0.1);
  return this.colorVector;
};

/////////////////////
// Editor API stuff
/////////////////////

EditScreen.prototype.addItem = function(name, pos, dir) {
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t];
    if (c.menuItemConfig && c.menuItemConfig.itemName == name) {
      c.menuItemConfig.factory(this, c.stamp, pos, dir);
      break;
    }
  }
};

/////////////////
// Spirit APIs //
/////////////////

EditScreen.prototype.isPlaying = function() {
  return true;
};
