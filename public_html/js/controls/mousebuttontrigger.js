/**
 * A single control Trigger, using the left mouse button.
 * @constructor
 * @extends {Trigger}
 */
function MouseButtonTrigger(elem) {
  Trigger.call(this);
  this.elem = elem || document;
  var self = this;
  this.downListener = function(e) {
    if (!e) e = window.event;
    if (MouseButtonTrigger.isLeftButton(e)) {
      self.val = true;
      self.publishTriggerDown();

      // For LayeredEventDistributor
      return false;
    }
  };
  this.upListener = function(e) {
    if (!e) e = window.event;
    if (MouseButtonTrigger.isLeftButton(e)) {
      self.val = false;
      self.publishTriggerUp();

      // For LayeredEventDistributor
      return false;
    }
  };
}

MouseButtonTrigger.prototype = new Trigger();
MouseButtonTrigger.prototype.constructor = MouseButtonTrigger;

MouseButtonTrigger.isLeftButton = function(e) {
  if (e.buttons) {
    return !!(e.buttons & 1);
  } else if ((typeof e.button) != 'undefined') {
    return e.button == 0;
  } else {
    return e.which == 1;
  }
};

MouseButtonTrigger.prototype.startListening = function() {
  this.elem.addEventListener('mousedown', this.downListener);
  this.elem.addEventListener('mouseup', this.upListener);
  return this;
};

MouseButtonTrigger.prototype.stopListening = function() {
  this.elem.removeEventListener('mousedown', this.downListener);
  this.elem.removeEventListener('mouseup', this.upListener);
  this.val = false;
  return this;
};

MouseButtonTrigger.prototype.getVal = function() {
  return this.val;
};