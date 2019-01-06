/**
 *
 * @param {number} pixelSize
 * @constructor
 */
function DistGrid(pixelSize) {
  this.pixelSize = pixelSize;
  this.pixels = new Map();
  // TODO:
}

// It's got over 67 million columns.
DistGrid.COLUMNS = 0x4000000;


/**
 * Takes integer pixel coords and delivers the world coords of the center of the pixel.
 * @param {Vec2d} pixelIn
 * @param {Vec2d} worldOut
 * @returns {Vec2d} worldOut
 */
DistGrid.prototype.pixelToWorld = function(pixelIn, worldOut) {
  return worldOut.set(pixelIn).scale(this.pixelSize);
};

/**
 * Takes world coords, and returns the <b>rounded-to-integer</b> pixel coords in pixel-space.
 * @param {Vec2d} worldIn
 * @param {Vec2d} pixelOut
 * @returns {Vec2d} pixelOut
 */
DistGrid.prototype.worldToPixel = function(worldIn, pixelOut) {
  pixelOut.set(worldIn).scale(1 / this.pixelSize);
  pixelOut.x = Math.round(pixelOut.x);
  pixelOut.y = Math.round(pixelOut.y);
  return pixelOut;
};

DistGrid.prototype.keyAtPixelXY = function(px, py) {
  return DistGrid.COLUMNS * Math.round(py) + Math.round(px) + DistGrid.COLUMNS / 2;
};

DistGrid.prototype.setXY = function(x, y, nearPixelX, nearPixelY) {
  let key = this.keyAtPixelXY(x, y);
  let val = this.pixels.get(key);
  if (!val) {
    val = new DistPixel();
    this.pixels.set(key, val);
  }
  let pixelDist = Vec2d.distance(x, y, nearPixelX, nearPixelY);
  val.setXYD(nearPixelX, nearPixelY, pixelDist);
};

DistGrid.prototype.getXY = function(x, y) {
  return this.pixels.get(this.keyAtPixelXY(x, y)) || null;
};

/**
 * Deletes a key with
 * @param {number} x
 * @param {number} y
 */
DistGrid.prototype.deleteXY = function(x, y) {
  this.pixels.delete(this.keyAtPixelXY(x, y));
};



/**
 * @constructor
 */
function DistPixel(opt_px, opt_py, opt_pd) {
  this.nearPixelX = opt_px || null;
  this.nearPixelY = opt_py || null;
  this.pixelDist = opt_pd || null;
}

/**
 *
 * @param nearPixelX The pixel coords of the
 * @param nearPixelY
 * @param pixelDist
 */
DistPixel.prototype.setXYD = function(nearPixelX, nearPixelY, pixelDist) {
  this.nearPixelX = nearPixelX;
  this.nearPixelY = nearPixelY;
  this.pixelDist = pixelDist;
};
