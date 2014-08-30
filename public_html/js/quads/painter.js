/**
 * @constructor
 */
function Painter() {
}

/**
 * @param cx center of the square
 * @param cy center of the square
 * @param radius radius of the square (half height and half width)
 * @param maxed whether this square is at the maximum quadtree depth or not.
 * @return PAINT_NOTHING, PAINT_DETAILS (only on a non-maxed square), or a paint color
 */
Painter.prototype.getEffect = function(cx, cy, radius, maxed, oldColor) {
  return Painter.PAINT_NOTHING;
};

Painter.PAINT_NOTHING = -1;
Painter.PAINT_DETAILS = -2;