/**
 * A visible on-screen trigger that can handle touch, mouse buttons, and keyboard keys.
 * @constructor
 */
function TriggerWidget(elem) {
  this.elem = elem;

  this.modelMatrix = new Matrix44();
  this.mat44 = new Matrix44();

  this.trigger = new MultiTrigger();
  this.touchTrigger = null;
  this.mousePointerTrigger = null;
  this.stamp = null;

  this.pressedColorVec4 = new Vec4().setXYZ(0.8, 0.8, 0.8);
  this.releasedColorVec4 = new Vec4().setXYZ(0.5, 0.5, 0.5);

  this.keyboardTipModelMatrix = new Matrix44();
  this.keyboardTipStamp = null;
  this.keyboardTipColorVec4 = new Vec4().setRGBA(0.5, 0.5, 0.5, 0.5);

  // Time at which the keyboard tip will stop being rendered
  this.keyboardTipUntilTimeMs = -Infinity;

  this.widgetCuboid = new Cuboid();
  this.keyboardTipCuboid = new Cuboid();
  this.keyboardTipRule = new CuboidRule(this.widgetCuboid, this.keyboardTipCuboid)
      .setSourceAnchor(new Vec4(0.75, 0.7, 0), Vec4.ZERO)
      .setTargetAnchor(Vec4.ZERO, Vec4.ZERO)
      .setSizingMax(new Vec4(0.12, 0.12, 1), Vec4.INFINITY);

  this.oldWidgetCuboid = new Cuboid(new Vec4(-1));
  this.oldKeyboardTipCuboid = new Cuboid(new Vec4(-1));
}

TriggerWidget.prototype.addTriggerKeyByName = function(keyName) {
  this.trigger.addTrigger((new KeyTrigger()).addTriggerKeyByName(keyName));
  return this;
};

TriggerWidget.prototype.listenToMouseButton = function() {
  this.trigger.addTrigger(new MouseButtonTrigger(this.elem));
  return this;
};

TriggerWidget.prototype.listenToTouch = function() {
  if (!this.touchTrigger) {
    this.touchTrigger = new TouchTrigger(this.elem).startListening();
    this.trigger.addTrigger(this.touchTrigger);
    this.updateStartZone();
  }
  return this;
};

TriggerWidget.prototype.listenToMousePointer = function() {
  if (!this.mousePointerTrigger) {
    this.mousePointerTrigger = new MousePointerTrigger(this.elem).startListening();
    this.trigger.addTrigger(this.mousePointerTrigger);
    this.updateStartZone();
  }
  return this;
};

TriggerWidget.prototype.setStamp = function(stamp) {
  this.stamp = stamp;
  return this;
};

TriggerWidget.prototype.setKeyboardTipStamp = function(stamp) {
  this.keyboardTipStamp = stamp;
  return this;
};

TriggerWidget.prototype.setPressedColorVec4 = function(vec4) {
  this.pressedColorVec4.set(vec4);
  return this;
};

TriggerWidget.prototype.setReleasedColorVec4 = function(vec4) {
  this.releasedColorVec4.set(vec4);
  return this;
};

/**
 * @returns {Cuboid} a reference to the internal cuboid for layout out the widget, so the caller
 * can attach a CuboidRule.
 */
TriggerWidget.prototype.getWidgetCuboid = function() {
  return this.widgetCuboid;
};

/**
 * @returns {CuboidRule} a reference to the internal keyboard tip rule, so callers can edit it.
 */
TriggerWidget.prototype.getKeyboardTipRule = function() {
  return this.keyboardTipRule;
};

TriggerWidget.prototype.setKeyboardTipColorVec4 = function(vec4) {
  this.keyboardTipColorVec4.set(vec4);
  return this;
};

/**
 * Sets the absolute time, in ms, at which the keyboard tip will stop being rendered.
 * @param {Number} timeMs
 */
TriggerWidget.prototype.setKeyboardTipTimeoutMs = function(timeMs) {
  this.keyboardTipUntilTimeMs = timeMs;
  return this;
};

TriggerWidget.prototype.startListening = function() {
  this.trigger.startListening();
  return this;
};

TriggerWidget.prototype.stopListening = function() {
  this.trigger.stopListening();
  return this;
};

TriggerWidget.prototype.getVal = function() {
  return this.trigger.getVal();
};

TriggerWidget.prototype.addTriggerDownListener = function(fn) {
  this.trigger.addTriggerDownListener(fn);
  return this;
};

TriggerWidget.prototype.removeTriggerDownListener = function(fn) {
  this.trigger.removeTriggerDownListener(fn);
  return this;
};

TriggerWidget.prototype.addTriggerUpListener = function(fn) {
  this.trigger.addTriggerUpListener(fn);
  return this;
};

TriggerWidget.prototype.removeTriggerUpListener = function(fn) {
  this.trigger.removeTriggerUpListener(fn);
  return this;
};

TriggerWidget.prototype.draw = function(renderer) {
  this.keyboardTipRule.apply();
  if (!this.widgetCuboid.equals(this.oldWidgetCuboid) || !this.keyboardTipCuboid.equals(this.oldKeyboardTipCuboid)) {
    this.oldWidgetCuboid.set(this.widgetCuboid);
    this.oldKeyboardTipCuboid.set(this.keyboardTipCuboid);
    this.updateStartZone();
    this.updateModelMatrix();
  }

  if (this.stamp) {
    renderer
        .setColorVector(this.getVal() ? this.pressedColorVec4 : this.releasedColorVec4)
        .setStamp(this.stamp)
        .setModelMatrix(this.modelMatrix)
        .drawStamp();
  }
  if (this.keyboardTipStamp && Date.now() < this.keyboardTipUntilTimeMs) {
    renderer
        .setColorVector(this.keyboardTipColorVec4)
        .setStamp(this.keyboardTipStamp)
        .setModelMatrix(this.keyboardTipModelMatrix)
        .drawStamp();
  }
  return this;
};

TriggerWidget.prototype.isMouseHovered = function() {
  return this.mousePointerTrigger && this.mousePointerTrigger.hovered;
};

TriggerWidget.prototype.updateStartZone = function() {
  var self = this;
  if (this.touchTrigger) {
    this.touchTrigger.setStartZoneFunction(function (x, y) {
      return self.widgetCuboid.overlapsXY(x, y);
    });
  }
  if (this.mousePointerTrigger) {
    this.mousePointerTrigger.setStartZoneFunction(function (x, y) {
      return self.widgetCuboid.overlapsXY(x, y);
    });
  }
  return this;
};

TriggerWidget.prototype.updateModelMatrix = function() {
  this.modelMatrix.toTranslateOpXYZ(this.widgetCuboid.pos.getX(), this.widgetCuboid.pos.getY(), -0.99)
      .multiply(this.mat44.toScaleOpXYZ(this.widgetCuboid.rad.getX(), this.widgetCuboid.rad.getY(), 1));
  this.keyboardTipModelMatrix.toTranslateOpXYZ(
      this.keyboardTipCuboid.pos.getX(), this.keyboardTipCuboid.pos.getY(), -0.99)
      .multiply(this.mat44.toScaleOpXYZ(this.keyboardTipCuboid.rad.getX(), -this.keyboardTipCuboid.rad.getY(), 0.01));
  return this;
};
