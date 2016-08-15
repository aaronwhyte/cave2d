/**
 * Owns the editor's cursor and edit-related triggers, cursor, and camera.
 * Hosted by a Screen that owns the world
 * @constructor
 */
function Editor(host, canvas, renderer, stamps) {
  this.host = host;
  this.canvas = canvas;
  this.renderer = renderer;
  // 'stamps' is jus for glyph stamps, for the button tool-tips

  // This is for all the special editor-only icons
  this.getStamps();

  this.releasedColorVec4 = new Vec4(1, 1, 1, 0.5);
  this.pressedColorVec4 = new Vec4(1, 1, 1, 0.9);

  this.addTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(this.addTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('e')
      .setKeyboardTipStamp(stamps['E'])
      .startListening();

  this.removeTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(this.removeTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('q')
      .setKeyboardTipStamp(stamps['Q'])
      .startListening();

  this.gripTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(this.gripTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('d')
      .setKeyboardTipStamp(stamps['D'])
      .startListening();

  this.digTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(this.digTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('s')
      .setKeyboardTipStamp(stamps['S'])
      .startListening();

  this.fillTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(this.releasedColorVec4)
      .setPressedColorVec4(this.pressedColorVec4)
      .setStamp(this.fillTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('a')
      .setKeyboardTipStamp(stamps['A'])
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
  this.cursorVel = new Vec2d();
  this.cursorStamp = null; // it'll be a ring
  this.colorVector = new Vec4();
  this.cursorRad = 2;
  this.cursorBody = this.createCursorBody();

  this.indicatedBodyId = null;
  this.indicatorChangeTime = 0;
  this.indicatorStamp = null; // it'll be a ring
  this.indicatorColorVector = new Vec4();

  this.gripPoint = null;
  this.gripAccelFraction = 0.3;
  this.gripFriction = 0.2;
  this.maxGripAccel = 10;

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();

  this.oldMouseEventCoords = new Vec2d();

  this.menu = new ModeMenuWidget(this.host.getHudEventTarget())
      .setIndicatorStamp(this.addMenuIndicatorStamp)
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

Editor.prototype.getStamps = function() {
  var model;
  if (!this.cursorStamp) {
    model = RigidModel.createTube(32).transformPositions(new Matrix44().toScaleOpXYZ(0.9, 0.9, 1));
    this.cursorStamp = model.createModelStamp(this.renderer.gl);
    console.log("this.cursorStamp", this.cursorStamp);
  }
  if (!this.indicatorStamp) {
    model = RigidModel.createTube(64);
    this.indicatorStamp = model.createModelStamp(this.renderer.gl);
  }
  if (!this.circleStamp) {
    model = RigidModel.createCircleMesh(5);
    this.circleStamp = model.createModelStamp(this.renderer.gl);
  }

  var triggerBackgroundModel = RigidModel.createSquare().transformPositions(
      new Matrix44().toTranslateOpXYZ(0, 0, 0.1))
      .setColorRGB(0.3, 0.3, 0.3);

  if (!this.addTriggerStamp) {
    model =
        RigidModel.createSquare().transformPositions(
            new Matrix44().toScaleOpXYZ(0.65, 0.15, 1))
            .addRigidModel(RigidModel.createSquare().transformPositions(
                new Matrix44().toScaleOpXYZ(0.15, 0.65, 1)))
            .addRigidModel(triggerBackgroundModel);
    this.addTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  if (!this.removeTriggerStamp) {
    model =
        RigidModel.createSquare()
            .transformPositions(new Matrix44().toScaleOpXYZ(0.65, 0.15, 1))
            .addRigidModel(RigidModel.createSquare().transformPositions(
                new Matrix44().toScaleOpXYZ(0.15, 0.65, 1)))
            .transformPositions(new Matrix44().toRotateZOp(Math.PI / 4))
            .addRigidModel(triggerBackgroundModel);
    this.removeTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  if (!this.gripTriggerStamp) {
    model =
        RigidModel.createCircleMesh(3).transformPositions(
            new Matrix44().toScaleOpXYZ(0.3, 0.3, 1))
            .addRigidModel(RigidModel.createRingMesh(4, 0.8).transformPositions(
                new Matrix44().toScaleOpXYZ(0.6, 0.6, 1)))
            .addRigidModel(triggerBackgroundModel);
    for (var i = 0; i < 4; i++) {
      model.addRigidModel(RigidModel.createTriangle().transformPositions(
          new Matrix44()
              .multiply(new Matrix44().toRotateZOp(i * Math.PI / 2))
              .multiply(new Matrix44().toTranslateOpXYZ(0, 0.76, 0))
              .multiply(new Matrix44().toScaleOpXYZ(0.06, 0.06, 1))
      ));
    }
    this.gripTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  var cursorIconRad = 0.43;

  if (!this.digTriggerStamp) {
    model = new RigidModel();
    for (var x = -7.5; x <= 7.5; x++) {
      var indent = 0;
      if (Math.abs(x) < 2) indent = 4/8;
      else if (Math.abs(x) < 3) indent = 3/8;
      else if (Math.abs(x) < 4) indent = 2/8;
      model.addRigidModel(RigidModel.createSquare().transformPositions(
              new Matrix44()
                  .multiply(new Matrix44().toTranslateOpXYZ(x/8, -1, 0.05))
                  .multiply(new Matrix44().toScaleOpXYZ(1/16, 0.5 * (1 - indent), 1))
                  .multiply(new Matrix44().toTranslateOpXYZ(0, 1, 0))));
    }
    model.addRigidModel(RigidModel.createRingMesh(5, 0.8).transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(cursorIconRad, cursorIconRad, 1)))
        .setColorRGB(1, 1, 1));
    model.addRigidModel(triggerBackgroundModel);
    this.digTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  if (!this.fillTriggerStamp) {
    model = new RigidModel();
    for (var x = -7.5; x <= 7.5; x++) {
      var outdent = 0;
      if (Math.abs(x) < 2) outdent = 4/8;
      else if (Math.abs(x) < 3) outdent = 3/8;
      else if (Math.abs(x) < 4) outdent = 2/8;
      model.addRigidModel(RigidModel.createSquare().transformPositions(
          new Matrix44()
              .multiply(new Matrix44().toTranslateOpXYZ(x/8, -1, 0.05))
              .multiply(new Matrix44().toScaleOpXYZ(1/16, 0.5 * (1 + outdent), 1))
              .multiply(new Matrix44().toTranslateOpXYZ(0, 1, 0))));
    }
    model.addRigidModel(RigidModel.createRingMesh(5, 0.8).transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(cursorIconRad, cursorIconRad, 1)))
        .setColorRGB(0.5, 0.5, 0.5));
    model.addRigidModel(triggerBackgroundModel);
    this.fillTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  if (!this.addMenuIndicatorStamp) {
    model = new RigidModel();
    var size = 1.5;
    var brightness = 0.5;

    var thickness = 0.3;
    var length = 0.5 + thickness;
    for (var i = 0; i < 4; i++) {
      model
          .addRigidModel(RigidModel.createSquare().transformPositions(
              new Matrix44()
                  .multiply(new Matrix44().toScaleOpXYZ(size, size, 1))
                  .multiply(new Matrix44().toRotateZOp(i * Math.PI/2))
                  .multiply(new Matrix44().toTranslateOpXYZ(-1 + length/2 - thickness, -1 - thickness/2, 0))
                  .multiply(new Matrix44().toScaleOpXYZ(length/2, thickness/2, 1))
          ))
          .addRigidModel(RigidModel.createSquare().transformPositions(
              new Matrix44()
                  .multiply(new Matrix44().toScaleOpXYZ(size, size, 1))
                  .multiply(new Matrix44().toRotateZOp(i * Math.PI/2))
                  .multiply(new Matrix44().toTranslateOpXYZ(-1 - thickness/2, -1 + length/2 - thickness, 0))
                  .multiply(new Matrix44().toScaleOpXYZ(thickness/2, length/2, 1))
          ));
    }
    model.setColorRGB(brightness, brightness, brightness);

//    model
//        .addRigidModel(
//            RigidModel.createRingMesh(4, 0.9)
//                .transformPositions(new Matrix44().multiply(new Matrix44().toScaleOpXYZ(size, size, 1)))
//                .setColorRGB(brightness * 1.5, brightness * 1.5, brightness * 1.5))
//        .addRigidModel(
//            RigidModel.createCircleMesh(3)
//                .transformPositions(new Matrix44().toScaleOpXYZ(size, size, 1))
//                .setColorRGB(brightness, brightness, brightness));

//    model
//        .addRigidModel(RigidModel.createSquare().transformPositions(
//            new Matrix44()
//                .multiply(new Matrix44().toScaleOpXYZ(size, size, 1))
//        ))
//        .setColorRGB(brightness, brightness, brightness);
    this.addMenuIndicatorStamp = model.createModelStamp(this.renderer.gl);
  }

  return [this.cursorStamp, this.indicatorStamp, this.circleStamp,
    this.addTriggerStamp, this.gripTriggerStamp, this.digTriggerStamp, this.fillTriggerStamp,
    this.addMenuIndicatorStamp];
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
    this.host.addItem(this.menu.getSelectedName(), this.cursorPos);
  }
  if (this.removeTriggerWidget.getVal() && this.indicatedBodyId) {
    this.host.removeByBodyId(this.indicatedBodyId);
    this.setIndicatedBodyId(null);
  }
  this.oldAddTriggerVal = this.addTriggerWidget.getVal();

  oldCursorPos.free();
};

Editor.prototype.dragObject = function() {
  var body = this.host.getBodyById(this.indicatedBodyId);
  var bodyPos = this.host.getBodyPos(body, this.vec2d);
  if (!this.gripPoint) {
    // Get a grip.
    this.gripPoint = Vec2d.alloc()
        .set(this.cursorPos)
        .subtract(bodyPos);
  }
  // Drag it! Drag it? Drag it!
  var newVel = Vec2d.alloc()
      .set(this.cursorPos)
      .subtract(bodyPos)
      .subtract(this.gripPoint)
      .scale(this.gripAccelFraction)
      .add(body.vel)
      .scale(1 - this.gripFriction);
  if (newVel.distance(body.vel) > this.maxGripAccel) {
    newVel.subtract(body.vel).clipToMaxLength(this.maxGripAccel).add(body.vel);
  }
  body.setVelAtTime(newVel, this.host.getWorldTime());
  newVel.free();
};

Editor.prototype.doCursorHoverScan = function() {
  this.cursorBody.setPosAtTime(this.cursorPos, this.host.getWorldTime());
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
        .setStamp(this.indicatorStamp)
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
      .setStamp(this.cursorStamp)
      .setColorVector(this.colorVector.setRGBA(
          ft ? 0.5 : coef,
          dt ? 0.5 : coef,
          gt ? 0.5 : coef,
          this.indicatedBodyId && gt && !(dt || ft || rt) ? 0.3 : 0.8));
  var outerCursorRad = this.cursorRad;
  var innerCursorRad = this.cursorRad * 0.9;
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(outerCursorRad, outerCursorRad, 1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.modelMatrix2.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
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