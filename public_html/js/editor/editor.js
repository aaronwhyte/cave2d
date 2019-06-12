/**
 * Owns the editor's cursor and edit-related triggers, cursor, and camera.
 * Hosted by a Screen that owns the world
 * @param host
 * @param canvas
 * @param renderer
 * @param {Glyphs} glyphs
 * @param {EditorStamps} editorStamps
 * @param {Object} spiritConfigs map maps spirit.type to Spiritconfig object, for the "add" menu and for adding items.
 * @param {=ChangeStack} opt_changeStack if you want undo
 * @constructor
 */
function Editor(host, canvas, renderer, glyphs, editorStamps, spiritConfigs, opt_changeStack) {
  this.host = host;
  this.canvas = canvas;
  this.renderer = renderer;
  // 'glyphs' is just for glyph stamps, for the button tool-tips
  this.stamps = editorStamps;
  this.spiritConfigs = spiritConfigs;
  this.changeStack = opt_changeStack || null;

  this.releasedColorVec4 = new Vec4(1, 1, 1, 0.8);
  this.pressedColorVec4 = new Vec4(1, 1, 1, 0.9);

  this.initWidgets(glyphs.initStamps(renderer.gl), editorStamps);

  if (host.addItem) {
    this.topLeftTriggers = [this.addTriggerWidget, this.removeTriggerWidget];
  } else {
    this.topLeftTriggers = [];
  }
  this.bottomLeftTriggers = [this.fillTriggerWidget, this.digTriggerWidget, this.gripTriggerWidget];
  this.leftTriggers = this.topLeftTriggers.concat(this.bottomLeftTriggers);

  this.oldPanTriggerVal = false;
  this.oldAddTriggerVal = false;
  this.cameraVel = new Vec2d();

  // touchscreen trackball, for pointing and panning
  this.trackball = new TouchTrackball(this.host.getWorldEventTarget())
      .setStartZoneFunction(function(x, y) {
        return true;
      });
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();
  this.host.addListener(this.trackball);

  // mouse for pointing and panning
  this.mousePointer = new MousePointer(this.canvas, this.host.getViewMatrix(), false);
  this.host.addListener(this.mousePointer);

  // arrow keys for panning
  this.keyStick = new KeyStick().setUpRightDownLeftByName(
      Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT);
  this.host.addListener(this.keyStick);

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  this.cursorPos = new Vec2d();
  this.cursorTail = new Vec2d();
  this.cursorDir = 0;
  this.cursorVel = new Vec2d();
  this.colorVector = new Vec4();
  this.cursorRad = 2;
  this.cursorBody = this.createCursorBody();

  this.indicatedBodyId = null;
  this.indicatorChangeTime = 0;
  this.indicatorColorVector = new Vec4();

  this.gripPoint = null;
  this.gripAccelFraction = 0.12;
  this.gripFriction = 0.2;
  this.maxGripAccel = 10;

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();

  this.oldMouseEventCoords = new Vec2d();

  this.menu = new ModeMenuWidget(this.host.getHudEventTarget())
      .setIndicatorStamp(editorStamps.addMenuIndicator)
      .startListening();

  this.canvasCuboid = new Cuboid();
  this.cuboidRules = [];
  this.addLeftTriggerRules(this.topLeftTriggers, 1);
  this.addLeftTriggerRules(this.bottomLeftTriggers, -1);
  this.addTopRightTriggerRules();
  this.updateHudLayout();

  this.buildMenu();

  this.ongoingEditGesture = false;

  this.digTileColor = 1;
  this.fillTileColor = 0;
}

/**
 * Hacky static cache to allow the editor to save stuff (like ChangeStack) in RAM while the user toggles between edit
 * and test.
 */
Editor.cache = null;
Editor.cacheKey = null;

/**
 * Returns a random key for the cache, to be used to get the cache back.
 * @param {*} val
 * @returns {number}
 */
Editor.setCache = function(val) {
  Editor.cache = val;
  Editor.cacheKey = Math.random() + performance.now();
  return Editor.cacheKey;
};

/**
 * If the key matches the last cached val, then this returns the cached val. Otherwise it returns null.
 * @param {number} key
 * @returns {*|null}
 */
Editor.getCache = function(key) {
  if (key && Editor.cacheKey === key) {
    return Editor.cache;
  }
  return null;
};

Editor.WIDGET_RADIUS = 30;

Editor.prototype.initWidgets = function(glyphStamps, editorStamps) {
  let self = this;
  function createTrigger(stamp, keyName, keyStamp, mouseable) {
    let widget = new TriggerWidget(self.host.getHudEventTarget())
        .setReleasedColorVec4(self.releasedColorVec4)
        .setPressedColorVec4(self.pressedColorVec4)
        .setStamp(stamp)
        .listenToTouch()
        .addTriggerKeyByName(keyName);
    if (keyStamp) widget.setKeyboardTipStamp(keyStamp);
    if (mouseable) widget.listenToMousePointer();
    self.host.addListener(widget);
    return widget;
  }

  this.addTriggerWidget = createTrigger(editorStamps.addTrigger, 'e', glyphStamps['E'], false);
  this.removeTriggerWidget = createTrigger(editorStamps.removeTrigger, 'q', glyphStamps['Q'], false);
  this.gripTriggerWidget = createTrigger(editorStamps.gripTrigger, 'd', glyphStamps['D'], false);
  this.digTriggerWidget = createTrigger(editorStamps.digTrigger, 's', glyphStamps['S'], false);
  this.fillTriggerWidget = createTrigger(editorStamps.fillTrigger, 'a', glyphStamps['A'], false);

  this.pauseTriggerWidget = createTrigger(editorStamps.pauseTrigger, Key.Name.SPACE, null, true)
      .addTriggerDownListener(this.host.pauseDownFn);

  if (this.changeStack) {
    this.undoDownFn = function(e) {
      e = e || window.event;
      self.undo();
      e.preventDefault();
    };

    this.redoDownFn = function(e) {
      e = e || window.event;
      self.redo();
      e.preventDefault();
    };
    this.undoTriggerWidget = createTrigger(editorStamps.undoTrigger, 'z', glyphStamps['Z'], true)
        .addTriggerDownListener(this.undoDownFn);
    this.redoTriggerWidget = createTrigger(editorStamps.redoTrigger, 'y', glyphStamps['Y'], true)
        .addTriggerDownListener(this.redoDownFn);
  }

  // weird keyboard-only one that doesn't use createTrigger
  this.panTriggerWidget = new TriggerWidget(this.host.getWorldEventTarget())
      .listenToMouseButton()
      .addTriggerKeyByName('w');
  this.host.addListener(this.panTriggerWidget);
};

/**
 * Adds CuboidRules for all the triggers in the array
 * @param triggers  an array of triggerWidgets
 * @param direction 1 if you're starting from the top, or -1 if starting from the bottom
 */
Editor.prototype.addLeftTriggerRules = function(triggers, direction) {
  let triggerFractionY = 1/(this.leftTriggers.length + 1);
  let maxSizeRad = new Vec4(1/5, triggerFractionY, 1);
  let maxSizePx = new Vec4(50, 50, Infinity);
  let sourceAnchorRad = new Vec4(-1, -direction, 0);
  for (let i = 0; i < triggers.length; i++) {
    let target = triggers[i].getWidgetCuboid();
    this.cuboidRules.push(new CuboidRule(this.canvasCuboid, target)
        .setAspectRatio(new Vec4(1, 1))
        .setSizingMax(maxSizeRad, maxSizePx)
        .setSourceAnchor(sourceAnchorRad, Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1, -direction * (1.25 + 2.25*i), 0), Vec4.ZERO));
  }
};

Editor.prototype.addTopRightTriggerRules = function() {
  this.cuboidRules.push(new CuboidRule(this.canvasCuboid, this.pauseTriggerWidget.getWidgetCuboid())
      .setSizingMax(new Vec4(1, 1, 1), new Vec4(Editor.WIDGET_RADIUS, Editor.WIDGET_RADIUS))
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
      .setTargetAnchor(new Vec4(1, -1), Vec4.ZERO));

  if (this.changeStack) {
    this.cuboidRules.push(new CuboidRule(this.canvasCuboid, this.undoTriggerWidget.getWidgetCuboid())
        .setSizingMax(new Vec4(1, 1, 1), new Vec4(Editor.WIDGET_RADIUS, Editor.WIDGET_RADIUS))
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
        .setTargetAnchor(new Vec4(1 + 2 * (2 + 0.25), -1), Vec4.ZERO));

    this.cuboidRules.push(new CuboidRule(this.canvasCuboid, this.redoTriggerWidget.getWidgetCuboid())
        .setSizingMax(new Vec4(1, 1, 1), new Vec4(Editor.WIDGET_RADIUS, Editor.WIDGET_RADIUS))
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(1, -1), Vec4.ZERO)
        .setTargetAnchor(new Vec4(1 + 2 + 0.25, -1), Vec4.ZERO));
  }
};

Editor.prototype.buildMenu = function() {
  if (!this.spiritConfigs) throw new Error('Editor spiritConfigs is falsy: ' + this.spiritConfigs);
  for (let t in this.spiritConfigs) {
    let c = this.spiritConfigs[t].menuItemConfig;
    if (c) {
      let m = new RigidModel().addRigidModel((c.model)
          .addRigidModel(RigidModel.createSquare()//createCircle(32)
              .transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, 0.1))
              .transformPositions(new Matrix44().toScaleOpXYZ(2, 2, 1))
              .setColorRGBA(0.1, 0.1, 0.1, 0.7)));
      this.addMenuItem(c.group, c.rank, c.itemName, m);
    }
  }
  for (let group = 0; group < this.getMaxGroupNum(); group++) {
    this.addMenuKeyboardShortcut(group, group + 1);
  }
};

Editor.KEYBOARD_TIP_TIMEOUT_MS = 30 * 1000;

Editor.prototype.addMenuItem = function(group, rank, name, model) {
  this.menu.setItem(group, rank, name, model);
};

Editor.prototype.getMaxGroupNum = function() {
  return this.menu.getMaxGroupNum();
};

Editor.prototype.addMenuKeyboardShortcut = function(groupNum, keyName) {
  this.menu.addKeyboardShortcut(groupNum, keyName);
};

Editor.prototype.getTriggerRad = function() {
  return this.leftTriggers[0].getWidgetCuboid().rad.getX();
};

Editor.prototype.getMenuItemSize = function() {
  return Math.min(
          this.getTriggerRad() * 1.3,
          (this.canvas.width - this.getTriggerRad() * 2 - 50) / (this.menu.groups.length + 0.5));
};

Editor.prototype.updateHudLayout = function() {
  this.triggerRad = this.getTriggerRad();
  this.triggerSpacing = this.triggerRad * 0.25;

  this.canvasCuboid.setToCanvas(this.canvas);
  for (let i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }

  let menuItemSize = this.getMenuItemSize();
  this.menu.setItemPositionMatrix(new Matrix44().toScaleOpXYZ(menuItemSize, menuItemSize, 1));
  this.menu.setItemScale(new Vec2d(1, -1).scale(menuItemSize * 0.3));
  this.menu.setPosition(new Vec2d(this.triggerRad * 2 + menuItemSize, this.triggerSpacing + menuItemSize * 0.6));
};

Editor.prototype.createCursorBody = function() {
  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = this.host.getCursorHitGroup();
  return b;
};

Editor.prototype.setKeyboardTipTimeoutMs = function(ms) {
  for (let i = 0; i < this.leftTriggers.length; i++) {
    this.leftTriggers[i].setKeyboardTipTimeoutMs(ms);
  }
  if (this.changeStack) {
    this.undoTriggerWidget.setKeyboardTipTimeoutMs(ms);
    this.redoTriggerWidget.setKeyboardTipTimeoutMs(ms);
  }
};

Editor.prototype.interrupt = function() {
  this.cameraVel.reset();
  this.cursorVel.reset();
  this.setIndicatedBodyId(null);
  this.oldPanTriggerVal = false;
  this.oldAddTriggerVal = false;
  this.panTriggerWidget.release();
  for (let i = 0; i < this.leftTriggers.length; i++) {
    this.leftTriggers[i].release();
  }
  this.ongoingEditGesture = false;
};

Editor.prototype.handleInput = function() {
  this.ongoingEditGesture = false;
  let oldCursorPos = Vec2d.alloc().set(this.cursorPos);
  let sensitivity = this.host.getViewDist() * 0.02;

  // touch trackball movement
  this.trackball.getVal(this.movement);
  if (this.trackball.isTouched()) {
    let inertia = 0.75;
    let newVel = Vec2d.alloc().setXY(this.movement.x, -this.movement.y).scale(sensitivity);
    this.cursorVel.scale(inertia).add(newVel.scale(1 - inertia));
    newVel.free();
  }
  this.trackball.reset();

  // mouse pointer movement
  this.mousePointer.setViewMatrix(this.host.getViewMatrix());
  if (!this.mousePointer.eventCoords.equals(this.oldMouseEventCoords) || this.panTriggerWidget.getVal()) {

    // TODO: don't do this here, but fix test37 and test38 to make the call themselves.
    this.setKeyboardTipTimeoutMs(Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS);

    this.cursorVel.reset();
    if (this.panTriggerWidget.getVal() && this.oldPanTriggerVal) {
      // panning
      this.cameraVel.set(this.cursorPos).subtract(this.mousePointer.position);
    } else if (this.panTriggerWidget.getVal()) {
      // halt
      this.cameraVel.reset();
    } else {
      // pointing
      this.cursorPos.set(this.mousePointer.position);
    }
  }
  this.oldMouseEventCoords.set(this.mousePointer.eventCoords);
  this.oldPanTriggerVal = this.panTriggerWidget.getVal();

  // arrow key panning
  this.keyStick.getVal(this.movement);
  if (!this.movement.isZero()) {
    this.cameraVel.add(this.movement.scale(0.1));
  }

  if (!this.cursorVel.isZero()) {
    this.cursorPos.add(this.cursorVel);
    // Increase friction at low speeds, to help make smaller movements.
    let slowness = Math.max(0, (1 - this.cursorVel.magnitude()/sensitivity));

    this.host.camera.follow(this.cursorPos);
    this.host.updateViewMatrix();
    this.mousePointer.setViewMatrix(this.host.getViewMatrix());

    this.cursorVel.scale(0.95 - 0.2 * slowness);
  }

  if (!this.cameraVel.isZero()) {
    this.host.camera.add(this.cameraVel);
    this.host.updateViewMatrix();
    this.mousePointer.setViewMatrix(this.host.getViewMatrix());

    if (!this.panTriggerWidget.getVal()) {
      // The camera is making the world drift beneath the mouse.
      this.cursorPos.set(this.mousePointer.position);
    }
    this.cameraVel.scale(0.94);
  }

  if (this.gripTriggerWidget.getVal() && this.indicatedBodyId) {
    this.dragObject();
    this.ongoingEditGesture = true;
  } else {
    if (this.gripPoint) {
      this.gripPoint.free();
      this.gripPoint = null;
    }
    this.doCursorHoverScan();
  }

  if (this.digTriggerWidget.getVal()) {
    this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, this.digTileColor);
    this.ongoingEditGesture = true;
  } else if (this.fillTriggerWidget.getVal()) {
    this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, this.fillTileColor);
    this.ongoingEditGesture = true;
  }

  if (this.addTriggerWidget.getVal() && !this.oldAddTriggerVal) {
    this.host.addItem(this.menu.getSelectedName(), this.cursorPos, this.cursorDir);
  }
  if (this.removeTriggerWidget.getVal() && this.indicatedBodyId) {
    this.host.removeByBodyId(this.indicatedBodyId);
    this.setIndicatedBodyId(null);
  }
  this.oldAddTriggerVal = this.addTriggerWidget.getVal();

  let moveLen = oldCursorPos.subtract(this.cursorPos).magnitude();
  if (moveLen) {
    let tailVel = Vec2d.alloc().set(this.cursorPos).subtract(this.cursorTail).scale(0.2 * moveLen);
    this.cursorTail.add(tailVel);
    this.cursorTail.subtract(this.cursorPos).scaleToLength(1).add(this.cursorPos);
    tailVel.free();
    this.updateCursorDir();
  }
  oldCursorPos.free();
};

Editor.prototype.updateCursorDir = function() {
  let cursorTailDiff = this.vec2d.set(this.cursorPos).subtract(this.cursorTail);
  this.cursorDir = Math.atan2(cursorTailDiff.x, cursorTailDiff.y) || 0;
};

Editor.prototype.dragObject = function() {
  let now = this.now();
  let body = this.host.getBodyById(this.indicatedBodyId);
  if (body) {
    let bodyPos = this.host.getBodyPos(body, this.vec2d);
    if (!this.gripPoint) {
      // Get a grip.
      this.gripPoint = Vec2d.alloc()
          .set(this.cursorPos)
          .subtract(bodyPos)
          .rot(-body.getAngPosAtTime(now));
    }

    let bodyToGrip = Vec2d.alloc()
        .set(this.gripPoint)
        .rot(body.getAngPosAtTime(now));
    let accel = Vec2d.alloc()
        .set(this.cursorPos)
        .subtract(bodyToGrip)
        .subtract(bodyPos)
        .scale(this.gripAccelFraction);
    let gripInWorld = Vec2d.alloc()
        .set(bodyPos)
        .add(bodyToGrip);

    body.applyAccelAtWorldPosAndTime(accel, gripInWorld, now);
    body.applyLinearFrictionAtTime(this.gripFriction, now);
    body.applyAngularFrictionAtTime(this.gripFriction, now);

    gripInWorld.free();
    accel.free();
    bodyToGrip.free();
    this.ongoingEditGesture = true;
  }
};

Editor.prototype.doCursorHoverScan = function() {
  this.cursorBody.setPosAtTime(this.cursorPos, this.now());
  let i, hitBody, overlapBodyIds;

  // center pinpoint check
  this.cursorBody.rad = 0;
  overlapBodyIds = this.host.getBodyOverlaps(this.cursorBody);
  let lowestArea = Infinity;
  let smallestBody = null;
  for (i = 0; i < overlapBodyIds.length; i++) {
    hitBody = this.host.getBodyById(overlapBodyIds[i]);
    if (hitBody) {
      if (hitBody.hitGroup !== this.host.getWallHitGroup() &&
          hitBody.getArea() < lowestArea) {
        lowestArea = hitBody.getArea();
        smallestBody = hitBody;
      }
    }
  }
  this.setIndicatedBodyId(smallestBody ? smallestBody.id : null);
};

Editor.prototype.setIndicatedBodyId = function(id) {
  if (id !== this.indicatedBodyId) {
    this.indicatedBodyId = id;
    this.indicatorChangeTime = Date.now();
  }
};

Editor.prototype.drawScene = function() {
  this.renderer.setBlendingEnabled(true);

  // highlighted body indicator
  let indicatedBody = this.host.getBodyById(this.indicatedBodyId);
  if (indicatedBody) {
    let bodyPos = this.host.getBodyPos(indicatedBody, this.vec2d);
    let innerRad = indicatedBody.rad + this.host.getViewDist() * 0.02;
    let outerRad = indicatedBody.rad + this.host.getViewDist() * 0.03;
    this.renderer
        .setStamp(this.stamps.indicator)
        .setColorVector(this.getIndicatorColorVector());
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.98))
        .multiply(this.mat44.toScaleOpXYZ(innerRad, innerRad, 1));
    this.renderer.setModelMatrix(this.modelMatrix);
    this.modelMatrix2.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.98))
        .multiply(this.mat44.toScaleOpXYZ(outerRad, outerRad, 1));
    this.renderer.setModelMatrix2(this.modelMatrix2);
    this.renderer.drawStamp();
  }

  // cursor
  let gt = this.gripTriggerWidget.getVal();
  let dt = this.digTriggerWidget.getVal();
  let ft = this.fillTriggerWidget.getVal();
  let rt = this.removeTriggerWidget.getVal();
  let any = ft || dt || gt || rt;
  let coef = any ? 1 : 0.8;
  this.renderer
      .setStamp(this.stamps.cursor)
      .setColorVector(this.colorVector.setRGBA(
          ft ? 0.5 : coef,
          dt ? 0.5 : coef,
          gt ? 0.5 : coef,
          this.indicatedBodyId && gt && !(dt || ft || rt) ? 0.3 : 0.8));
  let outerCursorRad = this.cursorRad;
  let innerCursorRad = this.cursorRad * 0.9;
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toRotateZOp(-this.cursorDir))
      .multiply(this.mat44.toScaleOpXYZ(outerCursorRad, outerCursorRad, 1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.modelMatrix2.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toRotateZOp(-this.cursorDir))
      .multiply(this.mat44.toScaleOpXYZ(innerCursorRad, innerCursorRad, 1));
  this.renderer.setModelMatrix2(this.modelMatrix2);
  this.renderer.drawStamp();

  this.renderer.setBlendingEnabled(false);

  if (this.changeStack) {
    // TODO: Move this somewhere more logical, or rename "drawScene" to "animate".
    if (this.host.isDirty() && !this.host.somethingMoving && !this.ongoingEditGesture) {
      // Push this completed change onto the change stack.
      this.saveToChangeStack(this.stopRecordingChanges());
      this.startRecordingChanges();
    }
  }
};

/**
 * Draw stuff on screen coords, with 0,0 at the top left and canvas.width, canvas.height at the bottom right.
 */
Editor.prototype.drawHud = function() {
  for (let i = 0; i < this.leftTriggers.length; i++) {
    this.leftTriggers[i].draw(this.renderer);
  }
  this.pauseTriggerWidget.draw(this.renderer);

  if (this.changeStack) {
    this.undoTriggerWidget.draw(this.renderer);
    this.redoTriggerWidget.draw(this.renderer);
  }

  this.menu.draw(this.renderer);
};

Editor.prototype.getIndicatorColorVector = function() {
  this.indicatorColorVector.setRGBA(1, 1, 1, 0.7);
  return this.indicatorColorVector;
};

Editor.prototype.getMousePageX = function() {
  return this.oldMouseEventCoords.x;
};

Editor.prototype.getMousePageY = function() {
  return this.oldMouseEventCoords.y;
};

/**
 * @return {boolean} true if the mouse is over a widget that is mouse-clickable.
 */
Editor.prototype.isMouseHovered = function() {
  // TODO also include all add-menu targets
  return this.pauseTriggerWidget.isMouseHovered();
};

Editor.prototype.now = function() {
  return this.host.getWorldTime();
};

///////////////
// Undo/Redo
///////////////

Editor.prototype.startRecordingChanges = function() {
  this.host.tileGrid.startRecordingChanges();
  this.host.world.startRecordingChanges();
};

Editor.prototype.stopRecordingChanges = function() {
  return this.host.tileGrid.stopRecordingChanges().concat(this.host.world.stopRecordingChanges());
};

Editor.prototype.undo = function() {
  this.stopMoving();
  let changes = this.stopRecordingChanges();
  if (changes.length) {
    this.saveToChangeStack(changes);
  }
  if (this.changeStack.hasUndo()) {
    // TODO view stuff
    this.applyChanges(this.changeStack.selectUndo());
  }
  this.startRecordingChanges();
};

Editor.prototype.redo = function() {
  this.stopMoving();
  let changes = this.stopRecordingChanges();
  if (changes.length) {
    this.saveToChangeStack(changes);
  }
  if (this.changeStack.hasRedo()) {
    this.applyChanges(this.changeStack.selectRedo());
  }
  this.startRecordingChanges();
};

Editor.prototype.applyChanges = function(changes) {
  let terrainChanges = [];
  let worldChanges = [];
  for (let i = 0; i < changes.length; i++) {
    let c = changes[i];
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
  this.host.tileGrid.applyChanges(terrainChanges);
  this.host.world.applyChanges(worldChanges);
};

/**
 * Saves changes and clears the dirty bit.
 */
Editor.prototype.saveToChangeStack = function(changes) {
  this.changeStack.save(changes);
  this.host.setDirty(false);
};

/**
 * Halts edit gestures and world movement, so the world can be saved without instantly
 * introducing more changes. If there are instant changes after a save, then it could
 * be impossible to undo past that point afterwards.
 */
Editor.prototype.stopMoving = function () {
  this.interrupt();
  for (let bodyId in this.host.world.bodies) {
    this.host.world.bodies[bodyId].stopMoving(this.now());
  }
};

Editor.prototype.onWorldToJson = function(json) {
  json.cursorPos = this.cursorPos.toJSON();
  json.cursorTail = this.cursorTail.toJSON();
  json.cacheKey = Editor.setCache(this.changeStack);
};

Editor.prototype.onLoadWorldFromJson = function(json) {
  if (json.cursorPos) {
    let cursorPos = Vec2d.fromJSON(json.cursorPos);
    if (cursorPos) this.cursorPos.set(Vec2d.fromJSON(json.cursorPos));
  }
  if (json.cursorTail) {
    this.cursorTail.set(Vec2d.fromJSON(json.cursorTail));
  }
  let cacheVal = Editor.getCache(json.cacheKey);
  if (cacheVal) {
    this.changeStack = cacheVal;
  }
  this.updateCursorDir();
};
