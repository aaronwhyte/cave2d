/**
 * @constructor
 * @extends {BaseScreen}
 */
function EditScreen(controller, canvas, renderer, stamps, sfx) {
  BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.changeStack = new ChangeStack(EditScreen.MAX_UNDO_DEPTH);

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
EditScreen.prototype = new BaseScreen();
EditScreen.prototype.constructor = EditScreen;

EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

EditScreen.ANT_RAD = 1.2;

EditScreen.MAX_UNDO_DEPTH = 20000;

EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs, EditorStamps.create(this.renderer));
  this.editor.gripAccelFraction = 0.25;
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t].menuItemConfig;
    if (c) {
      this.editor.addMenuItem(c.group, c.rank, c.itemName, c.model);
    }
  }
  for (var group = 0; group < this.editor.getMaxGroupNum(); group++) {
    this.editor.addMenuKeyboardShortcut(group, group + 1);
  }
};

EditScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  this.pauseTriggerRule.apply();
  this.undoTriggerRule.apply();
  this.redoTriggerRule.apply();
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
  this.pauseTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.pauseDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName(Key.Name.SPACE)
      .setStamp(this.stamps.editorPauseStamp);
  this.pauseTriggerRule = new CuboidRule(this.canvasCuboid, this.pauseTriggerWidget.getWidgetCuboid())
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(BaseScreen.WIDGET_RADIUS, BaseScreen.WIDGET_RADIUS))
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
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(BaseScreen.WIDGET_RADIUS, BaseScreen.WIDGET_RADIUS))
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
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(BaseScreen.WIDGET_RADIUS, BaseScreen.WIDGET_RADIUS))
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1 + 1 * (2 + 0.25), -1), Vec4.ZERO);
};

EditScreen.prototype.worldToJSON = function() {
  var json = {
    terrain: this.bitGrid.toJSON(),
    now: this.world.now,
    bodies: [],
    spirits: [],
    timeouts: null,
    splashes: []
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
  json.timeouts = this.world.getTimeoutsAsJson();

  // splashes
  var splashes = this.splasher.splashes;
  for (var i = 0; i < splashes.length; i++) {
    json.splashes.push(splashes[i].toJSON());
  }
  return json;
};

EditScreen.prototype.viewToJSON = function() {
  var json = {
    cursorPos: this.editor.cursorPos.toJSON(),
    cameraPos: this.camera.cameraPos.toJSON()
  };
  return json;
};

EditScreen.prototype.createDefaultWorld = function() {
  this.world.setChangeRecordingEnabled(true);
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 24;
  for (var a = 0; a < ants; a++) {
    this.addItem(BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }

  var ants = 12;
  for (var a = 0; a < ants; a++) {
    this.addItem(BaseScreen.MenuItem.ANT, new Vec2d(0, 10).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }
  this.startRecordingChanges();
};

EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

EditScreen.prototype.startRecordingChanges = function() {
  this.tileGrid.startRecordingChanges();
  this.world.startRecordingChanges();
};

EditScreen.prototype.stopRecordingChanges = function() {
  return this.tileGrid.stopRecordingChanges().concat(this.world.stopRecordingChanges());
};

EditScreen.prototype.undo = function() {
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

EditScreen.prototype.redo = function() {
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

EditScreen.prototype.applyChanges = function(changes) {
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
EditScreen.prototype.saveToChangeStack = function(changes) {
  this.changeStack.save(changes);
  this.setDirty(false);
};

/**
 * @param {Object} json
 */
EditScreen.prototype.loadWorldFromJson = function(json) {
  this.world.now = json.now;

  // bodies
  var lostSpiritIdToBodyId = {};
  for (var i = 0; i < json.bodies.length; i++) {
    var bodyJson = json.bodies[i];
    var body = new Body();
    body.setFromJSON(bodyJson);
    this.world.loadBody(body);
    lostSpiritIdToBodyId[body.spiritId] = body.id;
  }

  // spirits
  for (var i = 0; i < json.spirits.length; i++) {
    var spiritJson = json.spirits[i];
    var spiritType = spiritJson[0];
    var spiritConfig = this.spiritConfigs[spiritType];
    if (spiritConfig) {
      var spirit = new spiritConfig.ctor(this);
      spirit.setModelStamp(spiritConfig.stamp);
      spirit.setFromJSON(spiritJson);
      this.world.loadSpirit(spirit);
    } else {
      console.warn("Unknown spiritType " + spiritType + " in spirit JSON: " + spiritJson);
    }
    delete lostSpiritIdToBodyId[spirit.id];
  }

  // timeouts
  var e = new WorldEvent();
  for (var i = 0; i < json.timeouts.length; i++) {
    e.setFromJSON(json.timeouts[i]);
    this.world.loadTimeout(e);
  }

  // terrain
  // TODO: tileGrid.setFromJSON(json.terrain); and that's it.
  this.bitGrid = BitGrid.fromJSON(json.terrain);
  this.tileGrid = new TileGrid(this.bitGrid, this.renderer, this.world, this.getWallHitGroup());
  this.tileGrid.flushTerrainChanges();

//  // splashes
//  var splash = new Splash();
//  for (var i = 0; i < json.splashes.length; i++) {
//    var splashJson = json.splashes[i];
//    var splashType = splashJson[0];
//    // TODO: splashConfig plugin, like spiritConfig
//  }

  // Stop spiritless bodies from haunting the world.
  // This can happen if I add spirits to a level, then remove the definition.
  // TODO: something better
  for (var spiritId in lostSpiritIdToBodyId) {
    var bodyId = lostSpiritIdToBodyId[spiritId];
    this.world.removeBodyId(bodyId);
  }
};


EditScreen.prototype.drawScene = function() {
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
  this.undoTriggerWidget.draw(this.renderer);
  this.redoTriggerWidget.draw(this.renderer);
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

/**
 * Halts edit gestures and world movement, so the world can be saved without instantly
 * introducing more changes. If there are instant changes after a save, then it could
 * be impossible to undo past that point afterwards.
 */
EditScreen.prototype.stopChanges = function () {
  this.editor.interrupt();
  for (var bodyId in this.world.bodies) {
    this.world.bodies[bodyId].stopMoving(this.now());
  }
};

/////////////////////
// Editor API stuff
/////////////////////

EditScreen.prototype.addItem = function(name, pos, dir) {
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t];
    if (c.menuItemConfig && c.menuItemConfig.itemName == name) {
      c.menuItemConfig.factory(this, c.stamp, pos, dir);
      this.setDirty(true);
      return;
    }
  }
};

/////////////////
// Spirit APIs //
/////////////////

EditScreen.prototype.isPlaying = function() {
  return false;
};
