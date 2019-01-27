/**
 *
 * @param {number} pixelSize
 * @constructor
 */
function DistGrid(pixelSize) {
  this.pixelSize = pixelSize;
  this.pixels = new Map();

  this.startKeys = new Set();
  this.deferredKeys = new Set();

  this.currentFillDist = 0;
  this.maxFillDist = 3;
  this.lastSetKey = null;
  this.setCount = 0;
  this.lastVisitKey = null;

  this.vec2d = new Vec2d();
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

/**
 * @param {number} px
 * @param {number} py
 * @returns {number} a single numeric key for the (rounded-to-integer) coords
 */
DistGrid.prototype.keyAtPixelXY = function(px, py) {
  return DistGrid.COLUMNS * Math.round(py) + Math.round(px) + DistGrid.COLUMNS / 2;
};

/**
 * @param {number} keyIn
 * @param {Vec2d} vecOut
 * @returns {Vec2d} vecOut
 */
DistGrid.prototype.keyToPixelVec = function(keyIn, vecOut) {
  let y = Math.floor(keyIn / DistGrid.COLUMNS);
  return vecOut.setXY(keyIn - (y + 0.5) * DistGrid.COLUMNS, y);
};

/**
 * @param {number} x
 * @param {number} y
 * @param {number} nearPixelX
 * @param {number} nearPixelY
 */
DistGrid.prototype.setXY = function(x, y, nearPixelX, nearPixelY) {
  let key = this.keyAtPixelXY(x, y);
  let val = this.pixels.get(key);
  if (!val) {
    val = new DistPixel();
    this.pixels.set(key, val);
  }
  let pixelDist = Vec2d.distance(x, y, nearPixelX, nearPixelY);
  val.setXYXYD(x, y, nearPixelX, nearPixelY, pixelDist);
};

/**
 * @param {number} x
 * @param {number} y
 * @return {DistPixel}
 */
DistGrid.prototype.getXY = function(x, y) {
  return this.pixels.get(this.keyAtPixelXY(x, y)) || null;
};

/**
 * @param {Vec2d} v A world position
 * @return {DistPixel} The pixel overlapping that world point, or null
 */
DistGrid.prototype.getPixelAtWorldVec = function(v) {
  let p = this.worldToPixel(v, this.vec2d);
  return this.getXY(p.x, p.y);
};

DistGrid.prototype.getStepFromPxToWorldDist = function(px, d) {
  let targetPixelDist = d / this.pixelSize + px.pixelDist;
  if (targetPixelDist > this.maxFillDist) {
    console.log('targetPixelDist > this.maxFillDist', targetPixelDist, this.maxFillDist);
    return null;
  }
  let centerPx = px;
  let highestNeighbor = centerPx;
  let climbing = true;
  let step = 0;
  let retVal = null;
  while (climbing) {
    step++;
    climbing = false;
    centerPx = highestNeighbor;
    for (let dy = -1; dy <= 1; dy++) {
      let sy = centerPx.pixelY + dy;
      for (let dx = -1; dx <= 1; dx++) {
        let sx = centerPx.pixelX + dx;
        let scanPx = this.getXY(sx, sy);
        if (scanPx.pixelDist > highestNeighbor.pixelDist) {
          climbing = true;
          highestNeighbor = scanPx;
          if (step === 1) {
            retVal = scanPx;
          }
        }
        if (scanPx.pixelDist >= targetPixelDist) {
          return retVal;
        }
      }
    }
  }
  return null;
};


/**
 * @param {number} x
 * @param {number} y
 */
DistGrid.prototype.deleteXY = function(x, y) {
  this.pixels.delete(this.keyAtPixelXY(x, y));
};

/**
 * @param {number} x
 * @param {number} y
 */
DistGrid.prototype.addStartXY = function(x, y) {
  this.startKeys.add(this.keyAtPixelXY(x, y));
};

DistGrid.prototype.stepUntilDone = function() {
  while (this.step());
};

DistGrid.prototype.step = function() {
  if (!this.startKeys.size) {
    if (!this.deferredKeys.size) {
      return 0;
    } else {
      // swap start and deferred sets
      let temp = this.startKeys;
      this.startKeys = this.deferredKeys;
      this.deferredKeys = temp;
      // bump the fill level up by one
      this.currentFillDist++;
      if (this.currentFillDist > this.maxFillDist) {
        throw Error('this.currentFillDist > this.maxFillDist: ' + this.currentFillDist + ' > ' + this.maxFillDist);
      }
    }
  }

  // pick one arbitrary key
  let key;
  for (key of this.startKeys) {
    break;
  }

  if (!this.pixels.has(key)) {

    // Look at the 3x3 neighborhood
    let lowDist = Infinity;
    let lowPos = Vec2d.alloc();
    let centerPos = this.keyToPixelVec(key, Vec2d.alloc());
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; // handle self later
        let sx = centerPos.x + dx;
        let sy = centerPos.y + dy;
        let scanKey = this.keyAtPixelXY(sx, sy);
        let scanPixel = this.pixels.get(scanKey);
        if (scanPixel) {
          let dist = Vec2d.distance(centerPos.x, centerPos.y, scanPixel.nearPixelX, scanPixel.nearPixelY);
          if (dist < lowDist && dist <= this.currentFillDist) {
            lowDist = dist;
            lowPos.setXY(scanPixel.nearPixelX, scanPixel.nearPixelY);
          }
        }
      }
    }

    // Handle the center pixel: fill, defer, or drop
    this.lastVisitKey = key;
    if (lowDist !== Infinity) {
      // fill
      this.pixels.set(key, new DistPixel(centerPos.x, centerPos.y, lowPos.x, lowPos.y, lowDist));
      this.lastSetKey = key;
      this.setCount++;
      // make sure to scan neighbors this round too
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; // handle self later
          let sx = centerPos.x + dx;
          let sy = centerPos.y + dy;
          let scanKey = this.keyAtPixelXY(sx, sy);
          if (!this.pixels.has(scanKey) && !this.deferredKeys.has(scanKey)) {
            // Make sure it's queued for processing this round.
            this.startKeys.add(scanKey);
          }
        }
      }
    } else if (this.currentFillDist < this.maxFillDist) {
      this.deferredKeys.add(key);
    } else {
      // drop
    }
    centerPos.free();
    lowPos.free();
  }
  this.startKeys.delete(key);
  return this.startKeys.size + this.deferredKeys.size;
};


/**
 * Holds the values for a single pixel in a DistGrid.
 * @constructor
 */
function DistPixel(pixelX, pixelY, nearPixelX, nearPixelY, pixelDist) {
  this.setXYXYD(pixelX, pixelY, nearPixelX, nearPixelY, pixelDist);
}

/**
 * @param pixelX
 * @param pixelY
 * @param nearPixelX
 * @param nearPixelY
 * @param pixelDist
 */
DistPixel.prototype.setXYXYD = function(pixelX, pixelY, nearPixelX, nearPixelY, pixelDist) {
  this.pixelX = pixelX;
  this.pixelY = pixelY;
  this.nearPixelX = nearPixelX;
  this.nearPixelY = nearPixelY;
  this.pixelDist = pixelDist;
};

/**
 * Sets vecOut to a pixel-coord vec from this pixel to the nearest ground pixel.
 * @param {Vec2d} vecOut
 * @returns {Vec2d}
 */
DistPixel.prototype.getPixelToGround = function(vecOut) {
  return vecOut.setXY(this.nearPixelX - this.pixelX, this.nearPixelY - this.pixelY);
};