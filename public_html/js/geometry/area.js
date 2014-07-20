/**
 * An abstract 2d area, that can be overlapped with primitives like squares.
 * @constructor
 */
function Area() {
}

Area.OVERLAP_NONE = 0;
Area.OVERLAP_PARTIAL = 1;
Area.OVERLAP_FULL = 2;

Area.prototype.squareOverlap = function(x, y, r) {
  throw Error("implement squareOverlap");
  // return Area.OVERLAP_NONE = 0;
};

Area.prototype.getBoundingRect = function(opt_out) {
  throw Error("implement getBoundingRect");
  // return opt_out;
};
