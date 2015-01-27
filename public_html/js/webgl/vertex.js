/**
 * @constructor
 */
function Vertex() {
  this.position = new Vec4();
  this.color = new Vec4();
}

/**
 * @returns {Vertex} a deep copy of this vertex
 */
Vertex.prototype.copy = function() {
  var copy = new Vertex();
  copy.position.set(this.position);
  copy.color.set(this.position);
  return copy;
};

/**
 * @param {Matrix44} matrix
 * @return {Vertex} this
 */
Vertex.prototype.transformPosition = function(matrix) {
  this.position.transform(matrix);
  return this;
};