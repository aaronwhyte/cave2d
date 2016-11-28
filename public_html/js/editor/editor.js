/**
 * Owns the editor's cursor and edit-related triggers, cursor, and camera.
 * Hosted by a Screen that owns the world
 * @constructor
 */
function Editor(host, canvas, renderer, glyphs, stamps) {
  this.host = host;
  this.canvas = canvas;
  this.renderer = renderer;
  // 'glyphs' is just for glyph stamps, for the button tool-tips
  this.stamps = stamps;

  this.releasedColorVec4 = new Vec4(1, 1, 1, 0.5);
  this.pressedColorVec4 = new Vec4(1, 1, 1, 0.9);

  this.addTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(stamps.addTrigger)
      .listenToTouch()
      .addTriggerKeyByName('e')
      .setKeyboardTipStamp(glyphs['E'])
      .startListening();

  this.removeTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(stamps.removeTrigger)
      .listenToTouch()
      .addTriggerKeyByName('q')
      .setKeyboardTipStamp(glyphs['Q'])
      .startListening();

  this.gripTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(stamps.gripTrigger)
      .listenToTouch()
      .addTriggerKeyByName('d')
      .setKeyboardTipStamp(glyphs['D'])
      .startListening();

  this.digTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(stamps.digTrigger)
      .listenToTouch()
      .addTriggerKeyByName('s')
      .setKeyboardTipStamp(glyphs['S'])
      .startListening();

  this.fillTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(stamps.fillTrigger)
      .listenToTouch()
      .addTriggerKeyByName('a')
      .setKeyboardTipStamp(glyphs['A'])
      .startListening();

  this.panTriggerWidget = new TriggerWidget(this.host.getWorldEventTarget())
      .listenToMouseButton()
      .addTriggerKeyByName('w')
      .startListening();

  this.topLeftTriggers = [this.addTriggerWidget, this.removeTriggerWidget];
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
      .setIndicatorStamp(stamps.addMenuIndicator)
      .startListening();

  this.updateHudLayout();
}

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
  return Math.min(50, 0.4 * Math.min(this.canvas.height, this.canvas.width*1.3) / this.leftTriggers.length);
};

Editor.prototype.getMenuItemSize = function() {
  return Math.min(
          this.getTriggerRad() * 1.3,
          (this.canvas.width - this.getTriggerRad() * 2 - 50) / (this.menu.groups.length + 0.5));
};

Editor.prototype.updateHudLayout = function() {
  this.triggerRad = this.getTriggerRad();
  this.triggerSpacing = this.triggerRad * 0.25;
  var tipOffsetX = this.triggerRad * 0.75;
  var tipOffsetY = this.triggerRad * 0.7;
  var tipScale = this.triggerRad * 0.12;
  var triggerNum;
  var self = this;

  function triggerY(n) {
    return 2 * n * self.triggerRad + (n+1) * self.triggerSpacing + self.triggerRad;
  }
  triggerNum = 0;
  for (var i = 0; i < this.bottomLeftTriggers.length; i++) {
    this.bottomLeftTriggers[i]
        .setCanvasPositionXY(this.triggerRad, self.canvas.height - triggerY(triggerNum++))
        .setCanvasScaleXY(this.triggerRad, this.triggerRad)
        .setKeyboardTipOffsetXY(tipOffsetX, tipOffsetY)
        .setKeyboardTipScaleXY(tipScale, -tipScale);
  }
  triggerNum = 0;
  for (var i = 0; i < this.topLeftTriggers.length; i++) {
    this.topLeftTriggers[i]
        .setCanvasPositionXY(this.triggerRad, triggerY(triggerNum++))
        .setCanvasScaleXY(this.triggerRad, this.triggerRad)
        .setKeyboardTipOffsetXY(tipOffsetX, tipOffsetY)
        .setKeyboardTipScaleXY(tipScale, -tipScale);
  }
  this.panTriggerWidget.setCanvasPositionXY(-1, -1).setCanvasScaleXY(0, 0);

  var menuItemSize = this.getMenuItemSize();
  this.menu.setItemPositionMatrix(new Matrix44().toScaleOpXYZ(menuItemSize, menuItemSize, 1));
  this.menu.setItemScale(new Vec2d(1, -1).scale(menuItemSize * 0.3));
  this.menu.setPosition(new Vec2d(this.triggerRad * 2 + menuItemSize, this.triggerSpacing + menuItemSize * 0.6));
};

Editor.prototype.createCursorBody = function() {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = this.host.getCursorHitGroup();
  return b;
};

Editor.prototype.setKeyboardTipTimeoutMs = function(ms) {
  for (var i = 0; i < this.leftTriggers.length; i++) {
    this.leftTriggers[i].setKeyboardTipTimeoutMs(ms);
  }
};

Editor.prototype.handleInput = function() {
  var oldCursorPos = Vec2d.alloc().set(this.cursorPos);
  var sensitivity = this.host.getViewDist() * 0.02;

  // touch trackball movement
  this.trackball.getVal(this.movement);
  if (this.trackball.isTouched()) {
    var inertia = 0.75;
    var newVel = Vec2d.alloc().setXY(this.movement.x, -this.movement.y).scale(sensitivity);
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
    var slowness = Math.max(0, (1 - this.cursorVel.magnitude()/sensitivity));

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
  } else {
    if (this.gripPoint) {
      this.gripPoint.free();
      this.gripPoint = null;
    }
    this.doCursorHoverScan();
  }

  if (this.digTriggerWidget.getVal()) {
    this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, 1);
  } else if (this.fillTriggerWidget.getVal()) {
    this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, 0);
  }

  if (this.addTriggerWidget.getVal() && !this.oldAddTriggerVal) {
    this.host.addItem(this.menu.getSelectedName(), this.cursorPos, this.cursorDir);
  }
  if (this.removeTriggerWidget.getVal() && this.indicatedBodyId) {
    this.host.removeByBodyId(this.indicatedBodyId);
    this.setIndicatedBodyId(null);
  }
  this.oldAddTriggerVal = this.addTriggerWidget.getVal();

  var moveLen = oldCursorPos.subtract(this.cursorPos).magnitude();
  if (moveLen) {
    var tailVel = Vec2d.alloc().set(this.cursorPos).subtract(this.cursorTail).scale(0.2 * moveLen);
    this.cursorTail.add(tailVel);
    this.cursorTail.subtract(this.cursorPos).scaleToLength(1).add(this.cursorPos);
    tailVel.free();
    var cursorTailDiff = this.vec2d.set(this.cursorPos).subtract(this.cursorTail);
    this.cursorDir = Math.atan2(cursorTailDiff.x, cursorTailDiff.y) || 0;
  }
  oldCursorPos.free();

};

Editor.prototype.dragObject = function() {
  var now = this.now();
  var body = this.host.getBodyById(this.indicatedBodyId);
  if (body) {
    var bodyPos = this.host.getBodyPos(body, this.vec2d);
    if (!this.gripPoint) {
      // Get a grip.
      this.gripPoint = Vec2d.alloc()
          .set(this.cursorPos)
          .subtract(bodyPos)
          .rot(-body.getAngPosAtTime(now));
    }

    var bodyToGrip = Vec2d.alloc()
        .set(this.gripPoint)
        .rot(body.getAngPosAtTime(now));
    var force = Vec2d.alloc()
        .set(this.cursorPos)
        .subtract(bodyToGrip)
        .subtract(bodyPos)
        .scale(body.mass * this.gripAccelFraction);
    var gripInWorld = Vec2d.alloc()
        .set(bodyPos)
        .add(bodyToGrip);

    body.applyForceAtWorldPosAndTime(force, gripInWorld, now);
    body.applyLinearFrictionAtTime(this.gripFriction, now);
    body.applyAngularFrictionAtTime(this.gripFriction, now);

    gripInWorld.free();
    force.free();
    bodyToGrip.free();
  }
};

Editor.prototype.doCursorHoverScan = function() {
  this.cursorBody.setPosAtTime(this.cursorPos, this.now());
  var i, hitBody, overlapBodyIds;

  // center pinpoint check
  this.cursorBody.rad = 0;
  overlapBodyIds = this.host.getBodyOverlaps(this.cursorBody);
  var lowestArea = Infinity;
  var smallestBody = null;
  for (i = 0; i < overlapBodyIds.length; i++) {
    hitBody = this.host.getBodyById(overlapBodyIds[i]);
    if (hitBody) {
      if (hitBody.hitGroup != this.host.getWallHitGroup() &&
          hitBody.getArea() < lowestArea) {
        lowestArea = hitBody.getArea();
        smallestBody = hitBody;
      }
    }
  }
  this.setIndicatedBodyId(smallestBody ? smallestBody.id : null);
};

Editor.prototype.setIndicatedBodyId = function(id) {
  if (id != this.indicatedBodyId) {
    this.indicatedBodyId = id;
    this.indicatorChangeTime = Date.now();
  }
};

Editor.prototype.drawScene = function() {
  this.renderer.setBlendingEnabled(true);

  // highlighted body indicator
  var indicatedBody = this.host.getBodyById(this.indicatedBodyId);
  if (indicatedBody) {
    var bodyPos = this.host.getBodyPos(indicatedBody, this.vec2d);
    var innerRad = indicatedBody.rad + this.host.getViewDist() * 0.02;
    var outerRad = indicatedBody.rad + this.host.getViewDist() * 0.03;
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
  var gt = this.gripTriggerWidget.getVal();
  var dt = this.digTriggerWidget.getVal();
  var ft = this.fillTriggerWidget.getVal();
  var rt = this.removeTriggerWidget.getVal();
  var any = ft || dt || gt || rt;
  var coef = any ? 1 : 0.8;
  this.renderer
      .setStamp(this.stamps.cursor)
      .setColorVector(this.colorVector.setRGBA(
          ft ? 0.5 : coef,
          dt ? 0.5 : coef,
          gt ? 0.5 : coef,
          this.indicatedBodyId && gt && !(dt || ft || rt) ? 0.3 : 0.8));
  var outerCursorRad = this.cursorRad;
  var innerCursorRad = this.cursorRad * 0.9;
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
};

/**
 * Draw stuff on screen coords, with 0,0 at the top left and canvas.width, canvas.height at the bottom right.
 */
Editor.prototype.drawHud = function() {
  for (var i = 0; i < this.leftTriggers.length; i++) {
    this.leftTriggers[i].draw(this.renderer);
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

Editor.prototype.now = function() {
  return this.host.getWorldTime();
};