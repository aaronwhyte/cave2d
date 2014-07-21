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

QuadTree.prototype.paint = function(painter) {
  return this.paintQuadrants(painter, this.root, 1, this.center.x, this.center.y, this.radius);
};

/**
 * @param painter
 * @param quadrants
 * @param depth
 * @param centerX
 * @param centerY
 * @param radius
 */
QuadTree.prototype.paintQuadrants = function(painter, quadrants, depth, centerX, centerY, radius) {
  var halfR = radius * 0.5;
  for (var iy = 0; iy < 2; iy++) {
    var cy = centerY - halfR + iy * radius;
    for (var ix = 0; ix < 2; ix++) {
      var cx = centerX - halfR + ix * radius;
      var index = iy * 2 + ix;
      var maxed = depth === this.maxDepth;
      var oldColor = quadrants[index];

      var effect = painter.getEffect(cx, cy, halfR, maxed, oldColor);

      if (effect === Painter.PAINT_NOTHING) {
        // skip

      } else if (effect === Painter.PAINT_DETAILS) {
        if (maxed) throw Error('Cannot paint more detail when at max depth');
        if (!Array.isArray(quadrants[index])) {
          // break a leaf node into sub-quadrants
          quadrants[index] = [oldColor, oldColor, oldColor, oldColor];
        }
        this.paintQuadrants(painter, quadrants[index], depth + 1, cx, cy, halfR);

        // Maybe collapse the quadrant into a solid color.
        var uniformColor = quadrants[index][0];
        for (var i = 1; i < 4; i++) {
          if (quadrants[index][i] !== uniformColor) {
            break;
          }
          if (i == 3) {
            quadrants[index] = uniformColor;
          }
        }

      } else {
        // effect is a solid color
        quadrants[index] = effect;
      }
    }
  }
};

/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 * representing the entire area covered by the quadtree.
 */
QuadTree.prototype.getAllSquares = function(opt_pushToMe) {
  var squares = opt_pushToMe || [];

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

/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 * representing all the non-zero squares in the quadtree.
 */
QuadTree.prototype.getAllColoredSquares = function(opt_pushToMe) {
  var squares = opt_pushToMe || [];

  function visitQuadrants(quadrants, centerX, centerY, radius) {
    var halfR = radius * 0.5;
    for (var iy = 0; iy < 2; iy++) {
      var cy = centerY - halfR + iy * radius;
      for (var ix = 0; ix < 2; ix++) {
        var index = iy * 2 + ix;
        var cx = centerX - halfR + ix * radius;
        var quadrant = quadrants[index];
        if (Array.isArray(quadrant)) {
          visitQuadrants(quadrant, cx, cy, halfR);
        } else if (quadrant) {
          // non-zero
          squares.push([quadrant, cx, cy, halfR]);
        }
      }
    }
  }
  visitQuadrants(this.root, this.center.x, this.center.y, this.radius);
  return squares;
};

/**
 * Returns an array of arrays like
 * [[color, centerX, centerY, radius], [color, centerX, centerY, radius], ...]
 */
QuadTree.prototype.getSquaresOfColor = function(color, opt_pushToMe) {
  var squares = opt_pushToMe || [];

  function visitQuadrants(quadrants, centerX, centerY, radius) {
    var halfR = radius * 0.5;
    for (var iy = 0; iy < 2; iy++) {
      var cy = centerY - halfR + iy * radius;
      for (var ix = 0; ix < 2; ix++) {
        var index = iy * 2 + ix;
        var cx = centerX - halfR + ix * radius;
        var quadrant = quadrants[index];
        if (Array.isArray(quadrant)) {
          visitQuadrants(quadrant, cx, cy, halfR);
        } else if (quadrant == color) {
          squares.push([quadrant, cx, cy, halfR]);
        }
      }
    }
  }
  visitQuadrants(this.root, this.center.x, this.center.y, this.radius);
  return squares;
};
