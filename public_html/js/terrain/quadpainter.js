/**
 * Interface for a thing that paints QuadTreeGrids.
 * Deprecated because it's a bit overly complex. Try a BitGrid instead.
 * @constructor
 */
function QuadPainter() {
}

/**
 * @param cx center of the square
 * @param cy center of the square
 * @param radius radius of the square (half height and half width)
 * @param maxed whether this square is at the maximum quadtree depth or not.
 * @param oldColor The color of the area being painted, which is either an integer if the area is uniform, or
 * an array of four elements if it is a mix of four children.
 * @return PAINT_NOTHING, PAINT_DETAILS (only on a non-maxed square), or a paint color
 */
QuadPainter.prototype.getEffect = function(cx, cy, radius, maxed, oldColor) {
  return QuadPainter.PAINT_NOTHING;
};

QuadPainter.PAINT_NOTHING = -1;
QuadPainter.PAINT_DETAILS = -2;