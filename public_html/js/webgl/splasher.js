/**
 * @constructor
 */
function Splasher() {
  this.splashes = [];
}

Splasher.prototype.add = function(splash) {
  this.splashes.push(splash);
};

Splasher.prototype.draw = function(renderer, now) {
  for (var i = 0; i < this.splashes.length;) {
    var splash = this.splashes[i];
    if (splash.endTime < now) {
      // remove
      this.splashes[i].free();
      this.splashes[i] = this.splashes[this.splashes.length - 1];
      this.splashes.pop();
    } else {
      if (splash.startTime <= now) {
        // draw
        var duration = splash.endTime - splash.startTime;
        var t = (now - splash.startTime) / duration;
        renderer
            .setStamp(splash.stamp)
            .setColorVector(splash.colorFn(t))
            .setModelMatrix(splash.model1Fn(t));
        if (splash.model2Fn) {
          renderer.setModelMatrix2(splash.model2Fn(t));
        }
        renderer.drawStamp();
      }
      i++;
    }
  }
};

