/**
 * A control stick based on a keyboard.
 * @constructor
 * @extends {Stick}
 */
function TouchlikeClickPad() {
  ClickPad.call(this);
  this.vec2d = new Vec2d();
  this.lastClickMs = 0;
}

TouchlikeClickPad.MIN_REPEAT_MS = 250;

TouchlikeClickPad.prototype = new ClickPad();
TouchlikeClickPad.prototype.constructor = TouchlikeClickPad;

TouchlikeClickPad.prototype.setStick = function(stick) {
  this.stick = stick;
  return this;
};

TouchlikeClickPad.prototype.startListening = function() {
  this.stick.startListening();
  return this;
};

TouchlikeClickPad.prototype.stopListening = function() {
  this.stick.stopListening();
  return this;
};

TouchlikeClickPad.prototype.poll = function() {
  var v = this.stick.getVal(this.vec2d);
  var stickMag = v.magnitude();
  var scale = Math.min(1, (stickMag * 0.5 + 0.4999));
  var resetThreshold = 0.01;
  var pressThreshold = 0.05;
  var x = 0, y = 0;
  var now = Date.now();
  if (stickMag < resetThreshold) {
    // stick was "released" so allow immediate click (on next poll)
    this.lastClickMs = 0;
  }
  if (stickMag > pressThreshold && now > this.lastClickMs + TouchlikeClickPad.MIN_REPEAT_MS) {
    if (v.y > pressThreshold) {
      y = 1;
    }
    if (v.y < -pressThreshold) {
      y = -1;
    }

    if (v.x > pressThreshold) {
      x = 1;
    }
    if (v.x < -pressThreshold) {
      x = -1;
    }
  }
  if (x || y) {
    this.clickPubSub.publish(x, y);
    //scale = 0;
    this.lastClickMs = now;
  }
  this.stick.scale(scale);
};
