/**
 * @constructor
 */
function Splasher() {
  this.splashes = [];
  this.modelMatrix = new Matrix44();
  this.modelMatrix2 = new Matrix44();
  this.vec4 = new Vec4();
  this.drawMs = 0;
}

/**
 * Copies the fields in the splash to a new splash managed by this splasher.
 * @param {Splash} copyMe
 */
Splasher.prototype.addCopy = function(copyMe) {
  this.splashes.push(Splash.alloc().set(copyMe));
};

/**
 * Use the bad kind of drawing where a splash knows its stamp and draws immediately, no batching.
 * @param {Renderer} renderer
 * @param {number} now
 */
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
            .setModelMatrix(splash.getModelMatrix(now, this.modelMatrix))
            .setModelMatrix2(splash.getModelMatrix2(now, this.modelMatrix2))
            .drawStamp();
      }
      i++;
    }
  }
  this.drawMs += performance.now() - t;
};

/**
 * Use the good kind of drawing where splashes know modelIds and can use batched drawing.
 * @param {Screen} screen
 * @param {number} now
 */
Splasher.prototype.drawWithModelIds = function(screen, now) {
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
        screen.drawModel(splash.modelId,
            splash.getColor(now, this.vec4),
            splash.getModelMatrix(now, this.modelMatrix),
            splash.getModelMatrix2(now, this.modelMatrix2));
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

