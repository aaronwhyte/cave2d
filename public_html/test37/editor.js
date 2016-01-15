/**
 * Owns the cursor and edit-related triggers
 * @constructor
 */
function Editor(host, canvas, renderer) {
  this.host = host;
  this.canvas = canvas;
  this.renderer = renderer;
  this.getStamps();

  this.gripTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.3))
      .setPressedColorVec4(new Vec4(1, 1, 1, 0.9))
      .setStamp(this.gripTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('c')
      .startListening();

  this.digTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.3))
      .setPressedColorVec4(new Vec4(1, 1, 1, 0.9))
      .setStamp(this.digTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('x')
      .startListening();

  this.fillTriggerWidget = new TriggerWidget(this.host.getHudEventTarget())
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.3))
      .setPressedColorVec4(new Vec4(1, 1, 1, 0.9))
      .setStamp(this.fillTriggerStamp)
      .listenToTouch()
      .addTriggerKeyByName('z')
      .startListening();

  this.panTriggerWidget = new TriggerWidget(this.host.getWorldEventTarget())
      .listenToMouseButton()
      .addTriggerKeyByName('b')
      .startListening();

  this.updateHudLayout();

  this.oldPanTriggerVal = false;
  this.mousePanVec = new Vec2d();

  // trackball for touch and keyboard
  this.trackball = new MultiTrackball()
      .addTrackball(new KeyTrackball(new KeyStick().setUpRightDownLeftByName(
          Key.Name.DOWN, Key.Name.RIGHT, Key.Name.UP, Key.Name.LEFT)))
      .addTrackball(new TouchTrackball(this.host.getWorldEventTarget())
          .setStartZoneFunction(function(x, y) {
            return true;
          }));
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();
  this.host.addListener(this.trackball);

  // mouse for cursor control
  this.mousePointer = new MousePointer(this.canvas, this.host.getViewMatrix(), false);
  this.host.addListener(this.mousePointer);

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();

  this.cursorPos = new Vec2d();
  this.cursorVel = new Vec2d();
  this.cursorStamp = null; // it'll be a ring
  this.colorVector = new Vec4();
  this.cursorRad = 2;
  this.cursorMode = Editor.CursorMode.FLOOR;
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

  this.touched = false;
  this.moused = false;
  this.oldMouseEventCoords = new Vec2d();
}

Editor.CursorMode = {
  WALL: 0,
  FLOOR: 1,
  OBJECT: 2
};

Editor.prototype.updateHudLayout = function() {
  this.triggerRad = Math.min(50, 0.2 * Math.min(this.canvas.height, this.canvas.width) * 0.5);
  this.triggerSpacing = this.triggerRad /3;
  var triggerNum = 0;
  var self = this;

  function triggerY(n) {
    return self.canvas.height - (2 * n * self.triggerRad + (n+1) * self.triggerSpacing + self.triggerRad);
  }
  this.fillTriggerWidget
      .setCanvasPositionXY(this.triggerRad, triggerY(triggerNum++))
      .setCanvasScaleXY(this.triggerRad, this.triggerRad);
  this.digTriggerWidget
      .setCanvasPositionXY(this.triggerRad, triggerY(triggerNum++))
      .setCanvasScaleXY(this.triggerRad, this.triggerRad);
  this.gripTriggerWidget
      .setCanvasPositionXY(this.triggerRad, triggerY(triggerNum++))
      .setCanvasScaleXY(this.triggerRad, this.triggerRad);
  this.panTriggerWidget.setCanvasPositionXY(-1, -1).setCanvasScaleXY(0, 0);
};

Editor.prototype.getStamps = function() {
  var model;
  if (!this.cursorStamp) {
    model = RigidModel.createDoubleRing(32).transformPositions(new Matrix44().toScaleOpXYZ(0.9, 0.9, 1));
    this.cursorStamp = model.createModelStamp(this.renderer.gl);
  }
  if (!this.indicatorStamp) {
    model = RigidModel.createDoubleRing(64);
    this.indicatorStamp = model.createModelStamp(this.renderer.gl);
  }
  if (!this.circleStamp) {
    model = RigidModel.createCircleMesh(5);
    this.circleStamp = model.createModelStamp(this.renderer.gl);
  }

  var triggerBackgroundModel = RigidModel.createSquare().transformPositions(
      new Matrix44().toTranslateOpXYZ(0, 0, 0.1))
      .setColorRGB(0.3, 0.3, 0.3);

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
    model.addRigidModel(RigidModel.createRingMesh(5, 0.15).transformPositions(
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
    model.addRigidModel(RigidModel.createRingMesh(5, 0.15).transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(cursorIconRad, cursorIconRad, 1)))
        .setColorRGB(0.5, 0.5, 0.5));
    model.addRigidModel(triggerBackgroundModel);
    this.fillTriggerStamp = model.createModelStamp(this.renderer.gl);
  }

  return [this.cursorStamp, this.indicatorStamp, this.circleStamp,
    this.gripTriggerStamp, this.digTriggerStamp, this.fillTriggerStamp];
};

Editor.prototype.createCursorBody = function() {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = this.host.getCursorHitGroup();
  return b;
};

Editor.prototype.handleInput = function() {
  var oldCursorPos = Vec2d.alloc().set(this.cursorPos);
  var sensitivity = this.host.getViewDist() * 0.02;
  this.touched = false;
  this.moused = false;

  // touch trackball movement
  if (this.trackball.isTouched()) {
    this.touched = true;
    this.trackball.getVal(this.movement);
    var inertia = 0.75;
    var newVel = Vec2d.alloc().setXY(this.movement.x, -this.movement.y).scale(sensitivity);
    this.cursorVel.scale(inertia).add(newVel.scale(1 - inertia));
    newVel.free();
  }
  this.trackball.reset();
  this.cursorPos.add(this.cursorVel);
  // Increase friction at low speeds, to help make smaller movements.
  var slowness = Math.max(0, (1 - this.cursorVel.magnitude()/sensitivity));
  this.cursorVel.scale(0.95 - 0.2 * slowness);
  if (!this.cursorVel.isZero()) {
    this.host.camera.follow(this.cursorPos);
    this.host.updateViewMatrix();
  }

  // mouse pointer movement
  if (!this.mousePointer.eventCoords.equals(this.oldMouseEventCoords)) {
    this.moused = true;
    if (this.panTriggerWidget.getVal() && this.oldPanTriggerVal) {
      this.mousePanVec.set(this.cursorPos).subtract(this.mousePointer.position);
      this.host.camera.add(this.mousePanVec);
      this.host.updateViewMatrix();
    }
    this.mousePointer.setViewMatrix(this.host.getViewMatrix());
    this.cursorVel.reset();
    this.cursorPos.set(this.mousePointer.position);
  }
  this.mousePointer.setViewMatrix(this.host.getViewMatrix());
  this.oldMouseEventCoords.set(this.mousePointer.eventCoords);
  this.oldPanTriggerVal = this.panTriggerWidget.getVal();

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

Editor.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
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
  this.renderer
      .setStamp(this.cursorStamp)
      .setColorVector(this.colorVector.setRGBA(1, 1, 1, this.indicatedBodyId ? 0.3 : 0.5));
  var outerCursorRad = this.cursorRad;
  var innerCursorRad = this.cursorRad * 0.1;
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

  if (this.indicatedBodyId) {
  } else {

  }
};

/**
 * Draw stuff on screen coords, with 0,0 at the top left and canvas.width, canvas.height at the bottom right.
 */
Editor.prototype.drawHud = function() {
  this.gripTriggerWidget.draw(this.renderer);
  this.digTriggerWidget.draw(this.renderer);
  this.fillTriggerWidget.draw(this.renderer);
};

Editor.prototype.getIndicatorColorVector = function() {
  this.indicatorColorVector.setRGBA(1, 1, 1, 0.7);
  return this.indicatorColorVector;
};
