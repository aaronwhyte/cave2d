/**
 * A control Trigger using a mouse pointer.
 * @constructor
 * @extends {Trigger}
 */
function MousePointerTrigger(opt_elem) {
  Trigger.call(this);
  this.listening = false;
  this.elem = opt_elem || document.body;

  this.startZoneFn = function(x, y) {
    return true;
  };

  var self = this;
  this.mouseDownListener = function(e) {
    return self.onMouseDown(e);
  };
  this.mouseUpListener = function(e) {
    return self.onMouseUp(e);
  };
}

MousePointerTrigger.prototype = new Trigger();
MousePointerTrigger.prototype.constructor = MousePointerTrigger;

/**
 * @param {function} fn  A function that takes screen coords (x, y) and returns true if the coords are
 * within the trigger start zone.
 * @returns {MousePointerTrigger}
 */
MousePointerTrigger.prototype.setStartZoneFunction = function(fn) {
  this.startZoneFn = fn;
  return this;
};

MousePointerTrigger.prototype.startListening = function() {
  this.elem.addEventListener('mousedown', this.mouseDownListener);
  this.elem.addEventListener('mouseup', this.mouseUpListener);
  return this;
};

MousePointerTrigger.prototype.stopListening = function() {
  this.elem.removeEventListener('mousedown', this.mouseDownListener);
  this.elem.removeEventListener('mouseup', this.mouseUpListener);
  this.val = false;
  return this;
};

MousePointerTrigger.prototype.onMouseDown = function(e) {
  e = e || window.event;
  if (this.startZoneFn(e.pageX, e.pageY)) {
    this.val = true;
    this.publishTriggerDown(e);

    // For LayeredEventDistributor
    return false;
  }
};

MousePointerTrigger.prototype.onMouseUp = function(e) {
  e = e || window.event;
  if (this.val) {
    this.val = false;
    this.publishTriggerUp(e);

    // For LayeredEventDistributor
    return false;
  }
};
