/**
 * @constructor
 */
function Vertex() {
  this.position = new Vec4();
  this.color = new Vec4();
}

Vertex.prototype.setPositionXYZ = function(x, y, z) {
  this.position.setXYZ(x, y, z);
  return this;
};

Vertex.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
  return this;
};

/**
 * @returns {Vertex} a deep copy of this vertex
 */
Vertex.prototype.copy = function() {
  var copy = new Vertex();
  copy.position.set(this.position);
  copy.color.set(this.color);
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