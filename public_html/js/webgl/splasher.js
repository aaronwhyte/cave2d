/**
 * @constructor
 */
function Splasher() {
  this.splashes = [];
  this.matrix44 = new Matrix44();
  this.vec4 = new Vec4();
  this.drawMs = 0;
}

Splasher.prototype.addCopy = function(copyMe) {
  this.splashes.push(Splash.alloc().set(copyMe));
};

Splasher.prototype.draw = function(renderer, now) {
  let t = performance.now();
  for (let i = 0; i < this.splashes.length;) {
    let splash = this.splashes[i];
    if (splash.isExpired(now)) {
      // remove
      splash.free();
      this.splashes[i] = this.splashes[this.splashes.length - 1];
      this.splashes.pop();
    } else {
      if (splash.isVisible(now)) {
        renderer
            .setStamp(splash.stamp)
            .setColorVector(splash.getColor(now, this.vec4))
            .setModelMatrix(splash.getModelMatrix(now, this.matrix44))
            .setModelMatrix2(splash.getModelMatrix2(now, this.matrix44))
            .drawStamp();
      }
      i++;
    }
  }
  this.drawMs += performance.now() - t;
};

Splasher.prototype.clear = function() {
  for (let i = 0; i < this.splashes.length;) {
    this.splashes[i].free();
  }
  this.splashes.length = 0;
};

