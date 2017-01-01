/**
 * @constructor
 * @extends {Test41BaseScreen}
 */
function Test41EditScreen(controller, canvas, renderer, stamps, sfx) {
  Test41BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, Test41BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.changeStack = new ChangeStack(Test41EditScreen.MAX_UNDO_DEPTH);

  this.hudViewMatrix = new Matrix44();

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.editor.setKeyboardTipTimeoutMs(ms);
    self.undoTriggerWidget.setKeyboardTipTimeoutMs(ms);
    self.redoTriggerWidget.setKeyboardTipTimeoutMs(ms);
  };

  this.undoDownFn = function(e) {
    e = e || window.event;
    self.undo();

    // Stop the flow of mouse-emulation events on touchscreens, so the
    // mouse events don't cause weird cursors teleports.
    // See http://www.html5rocks.com/en/mobile/touchandmouse/#toc-together
    e.preventDefault();
  };

  this.redoDownFn = function(e) {
    e = e || window.event;
    self.redo();

    // Stop the flow of mouse-emulation events on touchscreens, so the
    // mouse events don't cause weird cursors teleports.
    // See http://www.html5rocks.com/en/mobile/touchandmouse/#toc-together
    e.preventDefault();
  };
}
Test41EditScreen.prototype = new Test41BaseScreen();
Test41EditScreen.prototype.constructor = Test41EditScreen;

Test41EditScreen.ANT_RAD = 1.2;

Test41EditScreen.MAX_UNDO_DEPTH = 20000;

Test41EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs, EditorStamps.create(this.renderer));
  this.editor.gripAccelFraction = 0.25;
  var configs = this.getSpiritConfigs();
  for (var t in configs) {
    var c = configs[t].menuItemConfig;
    if (c) {
      this.editor.addMenuItem(c.group, c.rank, c.itemName, c.model);
    }
  }
  for (var group = 0; group < this.editor.getMaxGroupNum(); group++) {
    this.editor.addMenuKeyboardShortcut(group, group + 1);
  }
};

Test41EditScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  this.pauseTriggerRule.apply();
  this.undoTriggerRule.apply();
  this.redoTriggerRule.apply();
  this.editor.updateHudLayout();
};

Test41EditScreen.prototype.getCamera = function() {
  return this.camera;
};

Test41EditScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  Test41BaseScreen.prototype.setScreenListening.call(this, listen);
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

Test41EditScreen.prototype.initWidgets = function() {
  this.pauseTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.pauseDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName(Key.Name.SPACE)
      .setStamp(this.stamps.editorPauseStamp);
  this.pauseTriggerRule = new CuboidRule(this.canvasCuboid, this.pauseTriggerWidget.getWidgetCuboid())
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(Test41BaseScreen.WIDGET_RADIUS, Test41BaseScreen.WIDGET_RADIUS))
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1, -1), Vec4.ZERO);

  this.undoTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.undoDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('z')
      .setKeyboardTipStamp(this.glyphs.stamps['Z'])
      .setStamp(this.stamps.editorUndoStamp);
  this.addListener(this.undoTriggerWidget);
  this.undoTriggerRule = new CuboidRule(this.canvasCuboid, this.undoTriggerWidget.getWidgetCuboid())
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(Test41BaseScreen.WIDGET_RADIUS, Test41BaseScreen.WIDGET_RADIUS))
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1 + 2 * (2 + 0.25), -1), Vec4.ZERO);

  this.redoTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.redoDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('y')
      .setKeyboardTipStamp(this.glyphs.stamps['Y'])
      .setStamp(this.stamps.editorRedoStamp);
  this.addListener(this.redoTriggerWidget);
  this.redoTriggerRule = new CuboidRule(this.canvasCuboid, this.redoTriggerWidget.getWidgetCuboid())
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(Test41BaseScreen.WIDGET_RADIUS, Test41BaseScreen.WIDGET_RADIUS))
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1 + 1 * (2 + 0.25), -1), Vec4.ZERO);
};

Test41EditScreen.prototype.createDefaultWorld = function() {
  this.world.setChangeRecordingEnabled(true);
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 24;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test41BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }

  var ants = 12;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test41BaseScreen.MenuItem.ANT, new Vec2d(0, 10).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }
  this.startRecordingChanges();
};

Test41EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Test41EditScreen.prototype.startRecordingChanges = function() {
  this.tileGrid.startRecordingChanges();
  this.world.startRecordingChanges();
};

Test41EditScreen.prototype.stopRecordingChanges = function() {
  return this.tileGrid.stopRecordingChanges().concat(this.world.stopRecordingChanges());
};

Test41EditScreen.prototype.undo = function() {
  this.stopChanges();
  var changes = this.stopRecordingChanges();
  if (changes.length) {
    this.saveToChangeStack(changes);
  }
  if (this.changeStack.hasUndo()) {
    // TODO view stuff
    this.applyChanges(this.changeStack.selectUndo());
  }
  this.startRecordingChanges();
};

Test41EditScreen.prototype.redo = function() {
  this.stopChanges();
  var changes = this.stopRecordingChanges();
  if (changes.length) {
    this.saveToChangeStack(changes);
  }
  if (this.changeStack.hasRedo()) {
    this.applyChanges(this.changeStack.selectRedo());
  }
  this.startRecordingChanges();
};

Test41EditScreen.prototype.applyChanges = function(changes) {
  var terrainChanges = [];
  var worldChanges = [];
  for (var i = 0; i < changes.length; i++) {
    var c = changes[i];
    switch (c.type) {
      case BitGrid.CHANGE_TYPE:
        terrainChanges.push(c);
        break;
      case World.ChangeType.BODY:
      case World.ChangeType.SPIRIT:
      case World.ChangeType.NOW:
      case World.ChangeType.QUEUE:
        worldChanges.push(c);
        break;
      default:
        console.log('Unhandled change: ' + JSON.stringify(c));
    }
  }
  this.tileGrid.applyChanges(terrainChanges);
  this.world.applyChanges(worldChanges);
};

/**
 * Saves changes and clears the dirty bit.
 */
Test41EditScreen.prototype.saveToChangeStack = function(changes) {
  this.changeStack.save(changes);
  this.setDirty(false);
};

Test41EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  var startTime = performance.now();
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  if (this.isDirty() && !this.somethingMoving && !this.editor.ongoingEditGesture) {
    // Push this completed change onto the change stack.
    this.saveToChangeStack(this.stopRecordingChanges());
    this.startRecordingChanges();
  }

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Test41EditScreen.prototype.drawHud = function() {
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
  this.undoTriggerWidget.draw(this.renderer);
  this.redoTriggerWidget.draw(this.renderer);
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

Test41EditScreen.prototype.configMousePointer = function() {
  if (this.pauseTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

/**
 * Halts edit gestures and world movement, so the world can be saved without instantly
 * introducing more changes. If there are instant changes after a save, then it could
 * be impossible to undo past that point afterwards.
 */
Test41EditScreen.prototype.stopChanges = function () {
  this.editor.interrupt();
  for (var bodyId in this.world.bodies) {
    this.world.bodies[bodyId].stopMoving(this.now());
  }
};

Test41EditScreen.prototype.isPlaying = function() {
  return false;
};
