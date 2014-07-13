/**
 * A square quadtree in world coordinates.
 * Values are numeric, and by default the whole area is set to 0.
 * @param {number} centerX
 * @param {number} centerY
 * @param {number} radius This is half the height and half the width
 * @param {number} maxDepth Must be at least 1, meaning the tree is just four squares.
 * @constructor
 */
function QuadTree(centerX, centerY, radius, maxDepth) {
  this.center = new Vec2d(centerX, centerY);
  this.radius = radius;
  this.maxDepth = maxDepth;

  // Every value is either a color number or an array of four nodes.
  this.root = [0, 0, 0, 0];
}

/**
 * Color an area of the quadtree.
 * @param area
 * @param color
 */
QuadTree.prototype.colorArea = function(area, color) {
  this.colorQuadrants(area, color, this.root, 1, this.center.x, this.center.y, this.radius);
};

/**
 * @param area
 * @param color
 * @param quadrants
 * @param depth
 * @param centerX
 * @param centerY
 * @param radius
 * @return {boolean} true if all quadrants get 100% covered, 0 otherwise.
 */
QuadTree.prototype.colorQuadrants = function(area, color, quadrants, depth, centerX, centerY, radius) {
  var halfR = radius * 0.5;
  var colorCount = 0;
  for (var iy = 0; iy < 2; iy++) {
    var cy = centerY - halfR + iy * radius;
    for (var ix = 0; ix < 2; ix++) {
      var index = iy * 2 + ix;

      if (quadrants[index] == color) {
        // Quadrant is already the target color.
        colorCount++;
        continue;
      }

      var cx = centerX - halfR + ix * radius;
      var overlap = area.squareOverlap(cx, cy, halfR);

      if (overlap == Area.OVERLAP_FULL) {
        quadrants[index] = color;
        colorCount++;

      } else if (overlap == Area.OVERLAP_PARTIAL) {
        if (depth < this.maxDepth) {
          // descend into the quadrant
          if (!Array.isArray(quadrants[index])) {
            var c = quadrants[index];
            // Turn a primitive child into four quadrants, based on the existing color.
            quadrants[index] = [c, c, c, c];
          }
          if (this.colorQuadrants(area, color, quadrants[index], depth + 1, cx, cy, halfR)) {
            colorCount++;
            // convert the child into a primitive
            quadrants[index] = color;
          }
        } else {
          // Color the terminal node if it even partly overlaps. That way, painting with
          // a mathematical point will work.
          quadrants[index] = color;
          colorCount++;
        }
      }
      // else there is no overlap, so do nothing
    }
  }
  return colorCount == 4;
};

/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 * representing the entire area covered by the quadtree.
 */
QuadTree.prototype.getAllSquares = function() {
  var squares = [];

  function visitQuadrants(quadrants, centerX, centerY, radius) {
    var halfR = radius * 0.5;
    for (var iy = 0; iy < 2; iy++) {
      var cy = centerY - halfR + iy * radius;
      for (var ix = 0; ix < 2; ix++) {
        var index = iy * 2 + ix;
        var cx = centerX - halfR + ix * radius;
        if (Array.isArray(quadrants[index])) {
          visitQuadrants(quadrants[index], cx, cy, halfR);
        } else {
          squares.push([quadrants[index], cx, cy, halfR]);
        }
      }
    }
  }
  visitQuadrants(this.root, this.center.x, this.center.y, this.radius);
  return squares;
};
