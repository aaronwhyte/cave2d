/**
 * A control trackball using up/down/left/right keys.
 * @param {KeyStick} keyStick
 * @param {KeyTrigger=} opt_turboTrigger
 * @constructor
 * @extends {Trackball}
 */
function KeyTrackball(keyStick, opt_turboTrigger) {
  Trackball.call(this);
  this.keyStick = keyStick;
  this.turboTrigger = opt_turboTrigger || null;
  this.turboMultiplier = 2.5;
  this.needsValChange = true;
  this.accel = 1;
  this.wasTouched = false;

  this.traction = 0.2;
  this.contributing = false;
}
KeyTrackball.prototype = new Trackball();
KeyTrackball.prototype.constructor = KeyTrackball;


KeyTrackball.prototype.setAccel = function(a) {
  this.accel = a;
  return this;
};

KeyTrackball.prototype.setTraction = function(t) {
  this.traction = t;
  return this;
};

/**
 * @param {Vec2d} out
 * @return {Vec2d} out
 */
KeyTrackball.prototype.getVal = function(out) {
  if (!this.wasTouched) {
    this.val.reset();
  } else if (this.needsValChange) {
    this.needsValChange = false;
    this.keyStick.getVal(out);
    if (out.isZero() && this.isTouched()) {
      // Opposite keys are touched. Slam the brakes.
      this.val.scale(0.5);
    } else {
      var turboFactor = this.getTurboTriggerVal() ? this.turboMultiplier : 1;
      this.val.scale(1 - this.traction).add(out.scale(this.accel * this.traction * turboFactor));
    }
  }
  this.wasTouched = this.isTouched();
  return out.set(this.val);
};

KeyTrackball.prototype.getContrib = function() {
  return (this.keyStick.isAnyKeyPressed() || this.getTurboTriggerVal()) ? Trackball.CONTRIB_KEY : 0;
};

/**
 * @returns {boolean}
 */
KeyTrackball.prototype.getTurboTriggerVal = function() {
  return this.turboTrigger ? this.turboTrigger.getVal() : false;
};

KeyTrackball.prototype.reset = function() {
  if (!this.isTouched()) {
    this.val.scale(1 - this.friction);
  }
  this.needsValChange = true;
};

/**
 * @returns {boolean}
 */
KeyTrackball.prototype.isTouched = function() {
  var touched = this.keyStick.isAnyKeyPressed() || this.getTurboTriggerVal();
  if (!touched) this.wasTouched = false;
  return touched;
};

KeyTrackball.prototype.startListening = function() {
  this.keyStick.startListening();
  if (this.turboTrigger) this.turboTrigger.startListening();
};

KeyTrackball.prototype.stopListening = function() {
  this.keyStick.stopListening();
  if (this.turboTrigger) this.turboTrigger.stopListening();
};
