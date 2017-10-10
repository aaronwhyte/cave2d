/**
 * A rectangular range of bits in a BitGrid cell.
 * @param {number} x0 top-left x
 * @param {number} y0 top-left y
 * @param {number} x1 bottom-right x
 * @param {number} y1 bottom-right y
 * @constructor
 */
function BitRect(x0, y0, x1, y1) {
  this.reset(x0, y0, x1, y1);
}


/**
 * @param {number} x0 top-left x
 * @param {number} y0 top-left y
 * @param {number} x1 bottom-right x
 * @param {number} y1 bottom-right y
 */
BitRect.prototype.reset = function(x0, y0, x1, y1) {
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
  return this;
};


BitRect.pool = [];

/**
 * @param {number} x0 top-left x
 * @param {number} y0 top-left y
 * @param {number} x1 bottom-right x
 * @param {number} y1 bottom-right y
 */
BitRect.alloc = function(x0, y0, x1, y1) {
  if (BitRect.pool.length) {
    return BitRect.pool.pop().reset(x0, y0, x1, y1);
  }
  return new BitRect(x0, y0, x1, y1);
};

BitRect.prototype.free = function() {
  BitRect.pool.push(this);
};


BitRect.prototype.createWorldRect = function(cellWorldX, cellWorldY, bitWorldSize) {
  var wx0 = cellWorldX + (this.x0 - 0.5) * bitWorldSize;
  var wy0 = cellWorldY + (this.y0 - 0.5) * bitWorldSize;
  var wx1 = cellWorldX + (this.x1 + 0.5) * bitWorldSize;
  var wy1 = cellWorldY + (this.y1 + 0.5) * bitWorldSize;
  return new Rect((wx0 + wx1)/2, (wy0 + wy1)/2, (wx1 - wx0)/2, (wy1 - wy0)/2);
};

/**
 * Calculates a fan wrapping this rect such that along each edge (top, left, bottom, right), there will a vertex
 * at the center of every 4-bit square that includes a bit of the opposite color, or which is outside the bounds of
 * the cell.
 * <p>
 * This is all to help create efficient tile models that contain no T-junctions, so vertex shaders that distort walls
 * will not create unsightly gaps between the wall rects, and so the edges of long flat walls will distort nicely.
 * @param cell
 * @param color
 * @param cwx cellWorldX
 * @param cwy cellWorldY
 * @param bws bitWorldSize
 * @return an array of Vec4 objs, where the 0th is the start of a fan, and the rest are the edge points,
 * sometimes including a repeated 1st point. In the case of 1x1 cells, the fan will be an unclosed 2-tri fan.
 */
BitRect.prototype.createWorldFan = function(cell, color, cwx, cwy, bws) {
  var verts = [];
  if (this.x0 === this.x1 && this.y0 === this.y1) {
    // special case 1x1
    // start at top-left, then go clockwise to other 3 points
    verts.push(new Vec4(cwx + (this.x0 - 0.5) * bws, cwy + (this.y0 - 0.5) * bws));
    verts.push(new Vec4(cwx + (this.x0 + 0.5) * bws, cwy + (this.y0 - 0.5) * bws));
    verts.push(new Vec4(cwx + (this.x0 + 0.5) * bws, cwy + (this.y0 + 0.5) * bws));
    verts.push(new Vec4(cwx + (this.x0 - 0.5) * bws, cwy + (this.y0 + 0.5) * bws));
  } else {
    // start with a point in the center of the rect
    verts.push(new Vec4(cwx + (this.x0 + this.x1) * bws / 2, cwy + (this.y0 + this.y1) * bws / 2));

    // top-left
    verts.push(new Vec4(cwx + (this.x0 - 0.5) * bws, cwy + (this.y0 - 0.5) * bws));
    // TODO: lots of other verts but lets test the basics first

    // top-right
    verts.push(new Vec4(cwx + (this.x1 + 0.5) * bws, cwy + (this.y0 - 0.5) * bws));

    // bottom-right
    verts.push(new Vec4(cwx + (this.x1 + 0.5) * bws, cwy + (this.y1 + 0.5) * bws));

    // bottom-left
    verts.push(new Vec4(cwx + (this.x0 - 0.5) * bws, cwy + (this.y1 + 0.5) * bws));

    // finally, top-left again
    verts.push(new Vec4().set(verts[1]));
  }
  return verts;
};