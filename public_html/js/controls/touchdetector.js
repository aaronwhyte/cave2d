/**
 * @constructor
 */
function TouchDetector() {
  this.listening = false;
  this.score = 0;

  var self = this;
  this.touchListener = function(e) {
    self.score = Math.min(5, self.score + 0.1);
  };
}

TouchDetector.prototype = new Trigger();
TouchDetector.prototype.constructor = TouchDetector;

TouchDetector.prototype.startListening = function() {
  document.body.addEventListener('touchstart', this.touchListener);
  document.body.addEventListener('touchmove', this.touchListener);
  document.body.addEventListener('touchend', this.touchListener);
  document.body.addEventListener('touchcancel', this.touchListener);
  return this;
};

TouchDetector.prototype.stopListening = function() {
  document.body.removeEventListener('touchstart', this.touchListener);
  document.body.removeEventListener('touchmove', this.touchListener);
  document.body.removeEventListener('touchend', this.touchListener);
  document.body.removeEventListener('touchcancel', this.touchListener);
  this.val = 0;
  return this;
};

TouchDetector.prototype.getVal = function() {
  this.score -= 0.01;
  return Math.max(0, Math.min(1, this.score));
};

