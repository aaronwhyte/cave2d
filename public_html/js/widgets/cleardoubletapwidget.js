/**
 * An widget that is invisible until tapped once, then appears/fades quickly unless tapped again.
 * @constructor
 */
function ClearDoubleTapWidget(elem) {
  this.elem = elem;

  this.modelMatrix = new Matrix44();
  this.mat44 = new Matrix44();
  this.vec2d = new Vec2d();
  this.stamp = null;
  this.colorVec4 = new Vec4().setXYZ(0.8, 0.8, 0.8);
  this.canvasPos = new Vec2d(0, 0);
  this.canvasScale = new Vec2d(1, 1);

  this.pubsub = new PubSub();

  // wall time in epoch ms of last recorded tap within listening area
  this.tapTime = 0;

  let self = this;

  this.touchStartListener = function(e) {
    self.onTouchStart(e);
  };
  // this.mouseDownListener = function(e) {
  //   self.onMouseDown(e);
  // };
  this.widgetCuboid = new Cuboid();

  this.updateModelMatrix();
}

ClearDoubleTapWidget.TIMEOUT = 700;

ClearDoubleTapWidget.prototype.setStamp = function(stamp) {
  this.stamp = stamp;
  return this;
};

ClearDoubleTapWidget.prototype.setColorVec4 = function(vec4) {
  this.colorVec4.set(vec4);
  return this;
};

/**
 * @returns {Cuboid} a reference to the internal cuboid for layout out the widget, so the caller
 * can attach a CuboidRule.
 */
ClearDoubleTapWidget.prototype.getWidgetCuboid = function() {
  return this.widgetCuboid;
};

ClearDoubleTapWidget.prototype.startListening = function() {
  return this.setListening(true);
};

ClearDoubleTapWidget.prototype.stopListening = function() {
  return this.setListening(false);
};

ClearDoubleTapWidget.prototype.setListening = function(listen) {
  Events.setListening(listen, this.elem, 'touchstart', this.touchStartListener);
  return this;
};

ClearDoubleTapWidget.prototype.addDoubleTapListener = function(fn) {
  this.pubsub.subscribe(fn);
  return this;
};

ClearDoubleTapWidget.prototype.removeDoubleTapListener = function(fn) {
  this.pubsub.unsubscribe(fn);
  return this;
};

ClearDoubleTapWidget.prototype.draw = function(renderer) {
  let fraction = (Date.now() - this.tapTime) / ClearDoubleTapWidget.TIMEOUT;
  if (this.stamp && fraction >= 0 && fraction <= 1) {
    this.updateModelMatrix();
    renderer
        .setColorVector(this.colorVec4)
        .setStamp(this.stamp)
        .setModelMatrix(this.modelMatrix)
        .drawStamp();
  }
  return this;
};

ClearDoubleTapWidget.prototype.fade = function() {
  this.tapTime = Date.now() - ClearDoubleTapWidget.TIMEOUT * 0.5;
};

ClearDoubleTapWidget.prototype.onMouseDown = function(e) {
  this.onDownXY(e.clientX, e.clientY);
};

ClearDoubleTapWidget.prototype.onTouchStart = function(e) {
  let touches = e.changedTouches;
  for (let i = 0; i < touches.length; i++) {
    let touch = touches[i];
    this.onDownXY(touch.pageX, touch.pageY);
    break;
  }
};

ClearDoubleTapWidget.prototype.onDownXY = function(x, y) {
  if (this.widgetCuboid.overlapsXY(x, y)) {
    let now = Date.now();
    if (now - this.tapTime < ClearDoubleTapWidget.TIMEOUT) {
      this.tapTime = 0;
      this.pubsub.publish();
    } else {
      this.tapTime = now;
    }
  }
};

ClearDoubleTapWidget.prototype.updateModelMatrix = function() {
  let fraction = (Date.now() - this.tapTime) / ClearDoubleTapWidget.TIMEOUT;
  let size = 1.5 * Math.cos((fraction * 1.5 - 0.5) * Math.PI/2);
  this.modelMatrix.toTranslateOpXYZ(this.widgetCuboid.pos.getX(), this.widgetCuboid.pos.getY(), -0.99)
      .multiply(this.mat44.toScaleOpXYZ(size * this.widgetCuboid.rad.getX(), size * this.widgetCuboid.rad.getY(), 1));
  return this;
};
