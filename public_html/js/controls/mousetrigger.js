/**
 * A single control Trigger, using the left mouse button.
 * @constructor
 * @extends {Trigger}
 */
function MouseTrigger() {
  Trigger.call(this);

  var self = this;
  this.downListener = function(e) {
    if (!e) e = window.event;
    if (MouseTrigger.isLeftButton(e)) {
      self.val = true;
      self.publishTriggerDown();
    }
  };
  this.upListener = function(e) {
    if (!e) e = window.event;
    if (MouseTrigger.isLeftButton(e)) {
      self.val = false;
      self.publishTriggerUp();
    }
  };
}

MouseTrigger.prototype = new Trigger();
MouseTrigger.prototype.constructor = MouseTrigger;

MouseTrigger.isLeftButton = function(e) {
  if (e.buttons) {
    return !!(e.buttons & 1);
  } else if ((typeof e.button) != 'undefined') {
    return e.button == 0;
  } else {
    return e.which == 1;
  }
};

MouseTrigger.prototype.startListening = function() {
  document.addEventListener('mousedown', this.downListener);
  document.addEventListener('mouseup', this.upListener);
  return this;
};

MouseTrigger.prototype.stopListening = function() {
  document.removeEventListener('mousedown', this.downListener);
  document.removeEventListener('mouseup', this.upListener);
  this.val = false;
  return this;
};

MouseTrigger.prototype.getVal = function() {
  return this.val;
};