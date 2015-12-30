/**
 * Owns the cursor and edit-related triggers
 * @constructor
 */
function Editor(host, canvas, renderer) {
  this.host = host;
  this.canvas = canvas;
  this.renderer = renderer;

  var self = this;

  // grip trigger
  this.gripTouchTrigger = new RoundTouchTrigger(this.host.getCanvas())
      .setPosFractionXY(0.03, 1 - 0.1).setRadCoefsXY(0.04, 0.04);
  this.gripTrigger = new MultiTrigger()
      .addTrigger((new KeyTrigger()).addTriggerKeyByName('z'))
      .addTrigger(this.gripTouchTrigger);
  this.host.addListener(this.gripTrigger);

  // pan trigger
  this.panTouchTrigger = new RoundTouchTrigger(this.host.getCanvas())
      .setPosFractionXY(0.03, 1 - 0.3).setRadCoefsXY(0.04, 0.04);
  this.panTrigger = new MultiTrigger()
      .addTrigger((new KeyTrigger()).addTriggerKeyByName('x'))
      .addTrigger(new MouseTrigger())
      .addTrigger(this.panTouchTrigger);
  this.host.addListener(this.panTrigger);

  this.mousePanVec = new Vec2d();

  // trackball for touch only
  this.trackball = new TouchTrackball().setStartZoneFunction(function(x, y) {
        return !self.gripTouchTrigger.startZoneFn(x, y);
      });
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();
  this.host.addListener(this.trackball);

  // mouse for cursor control
  this.mousePointer = new MousePointer(this.canvas, this.host.getViewMatrix(), false);
  this.host.addListener(this.mousePointer);

  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.hudViewMatrix = new Matrix44();

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
}

Editor.CursorMode = {
  WALL: 0,
  FLOOR: 1,
  OBJECT: 2
};

Editor.prototype.getStamps = function() {
  var model;
  if (!this.cursorStamp) {
    model = RigidModel.createDoubleRing(32);
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
  return [this.cursorStamp, this.indicatorStamp, this.circleStamp];
};

Editor.prototype.createCursorBody = function() {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.rad = this.cursorRad;
  b.hitGroup = this.host.getCursorHitGroup();
  return b;
};

Editor.prototype.handleInput = function() {
  var triggered = this.gripTrigger.getVal();
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
  if (!this.mousePointer.position.equals(this.mousePointer.oldPosition)) {
    this.moused = true;
    if (this.panTrigger.getVal()) {
      this.mousePanVec.set(this.cursorPos).subtract(this.mousePointer.position);
      this.host.camera.add(this.mousePanVec);
      this.host.updateViewMatrix();
    }
    this.mousePointer.setViewMatrix(this.host.getViewMatrix());
    this.cursorVel.reset();
    this.cursorPos.set(this.mousePointer.position);
  }

  if (triggered) {
    this.doTriggerAction(oldCursorPos);
  } else {
    if (this.gripPoint) {
      this.gripPoint.free();
      this.gripPoint = null;
    }
    this.doCursorHoverScan();
  }
  oldCursorPos.free();
};

Editor.prototype.doTriggerAction = function(oldCursorPos) {
  switch (this.cursorMode) {
    case Editor.CursorMode.FLOOR:
      this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, 1);
      break;
    case Editor.CursorMode.WALL:
      this.host.drawTerrainPill(oldCursorPos, this.cursorPos, this.cursorRad, 0);
      break;
    case Editor.CursorMode.OBJECT:
      this.dragObject();
      break;
  }
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
  var overWall = false;
  for (i = 0; i < overlapBodyIds.length; i++) {
    hitBody = this.host.getBodyById(overlapBodyIds[i]);
    if (hitBody) {
      if (hitBody.hitGroup == this.host.getWallHitGroup()) {
        overWall = true;
      } else if (hitBody.getArea() < lowestArea) {
        lowestArea = hitBody.getArea();
        smallestBody = hitBody;
      }
    }
  }
  if (smallestBody) {
    this.setIndicatedBodyId(smallestBody.id);
    this.cursorMode = Editor.CursorMode.OBJECT;
  } else if (overWall) {
    this.setIndicatedBodyId(null);
    this.cursorMode = Editor.CursorMode.WALL;
  } else {
    this.setIndicatedBodyId(null);
    this.cursorMode = Editor.CursorMode.FLOOR;
  }
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
    var indicatorRad = indicatedBody.rad + this.host.getViewDist() * 0.02;
    this.renderer
        .setStamp(this.indicatorStamp)
        .setColorVector(this.getIndicatorColorVector());
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.99))
        .multiply(this.mat44.toScaleOpXYZ(indicatedBody.rad, indicatedBody.rad, 1));
    this.renderer.setModelMatrix(this.modelMatrix);
    this.modelMatrix2.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.99))
        .multiply(this.mat44.toScaleOpXYZ(indicatorRad, indicatorRad, 1));
    this.renderer.setModelMatrix2(this.modelMatrix2);
    this.renderer.drawStamp();
  }

  // cursor
  this.renderer
      .setStamp(this.cursorStamp)
      .setColorVector(this.getCursorColorVector());
  var outerCursorRad = indicatedBody ? this.cursorRad * 0.3 : this.cursorRad;
  var innerCursorRad = indicatedBody ? 0 : this.cursorRad * 0.3;
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(outerCursorRad, outerCursorRad, 1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.modelMatrix2.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.cursorPos.x, this.cursorPos.y, -0.99))
      .multiply(this.mat44.toScaleOpXYZ(innerCursorRad, innerCursorRad, 1));
  this.renderer.setModelMatrix2(this.modelMatrix2);
  this.renderer.drawStamp();

  this.drawHud();
  this.renderer.setBlendingEnabled(false);
};

/**
 * Draw stuff on screen coords, with 0,0 at the top left and canvas.width, canvas.height at the bottom right.
 */
Editor.prototype.drawHud = function() {
  // Set hud view matrix
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  // draw grip trigger
  this.renderer
      .setStamp(this.circleStamp)
      .setColorVector(this.getTriggerColorVector(this.gripTrigger.getVal()));
  var gripTriggerRad = this.gripTouchTrigger.getRad();
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.gripTouchTrigger.getX(), this.gripTouchTrigger.getY(), -0.99))
      .multiply(this.mat44.toScaleOpXYZ(gripTriggerRad, gripTriggerRad, 1));
  this.renderer.setModelMatrix(this.modelMatrix);
  this.renderer.drawStamp();

//  // draw pan trigger
//  this.renderer
//      .setStamp(this.circleStamp)
//      .setColorVector(this.getTriggerColorVector(this.panTrigger.getVal()));
//  var panTriggerRad = this.panTouchTrigger.getRad();
//  this.modelMatrix.toIdentity()
//      .multiply(this.mat44.toTranslateOpXYZ(this.panTouchTrigger.getX(), this.panTouchTrigger.getY(), -0.99))
//      .multiply(this.mat44.toScaleOpXYZ(panTriggerRad, panTriggerRad, 1));
//  this.renderer.setModelMatrix(this.modelMatrix);
//  this.renderer.drawStamp();
};

Editor.prototype.getCursorColorVector = function() {
  var brightness = 0.5 + 0.5 * this.gripTrigger.getVal();
  switch(this.cursorMode) {
    case Editor.CursorMode.FLOOR:
      this.colorVector.setRGBA(1, 0, 0, 0.8 * brightness);
      break;
    case Editor.CursorMode.WALL:
      this.colorVector.setRGBA(0, 1, 0, 0.8 * brightness);
      break;
    case Editor.CursorMode.OBJECT:
      this.colorVector.setRGBA(1, 1, 1, 0.5 * brightness);
      break;
  }
  return this.colorVector;
};

Editor.prototype.getTriggerColorVector = function(down) {
  this.colorVector.setRGBA(1, 1, 1, down ? 0.2 : 0.1);
  return this.colorVector;
};

Editor.prototype.getIndicatorColorVector = function() {
  var t = (Date.now() - this.indicatorChangeTime) / 200;
  var c = Math.cos(t)/5+0.5;
  this.indicatorColorVector.setRGBA(c, c, c, 0.5);
  return this.indicatorColorVector;
};
