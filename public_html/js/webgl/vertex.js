/**
 * A WebGL-ish vertex, used to define models.
 * @constructor
 */
function Vertex() {
  this.position = new Vec4();
  this.color = new Vec4();
  this.group = 0;
}

Vertex.prototype.setPositionXYZ = function(x, y, z) {
  this.position.setXYZ(x, y, z);
  return this;
};

Vertex.prototype.setPositionArray = function(xyz) {
  this.setPositionXYZ(xyz[0], xyz[1], xyz[2]);
  return this;
};

Vertex.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
  return this;
};

Vertex.prototype.setColorRGBA = function(r, g, b, a) {
  this.color.setRGBA(r, g, b, a);
  return this;
};

Vertex.prototype.setColorArray = function(rgb) {
  this.setColorRGB(rgb[0], rgb[1], rgb[2]);
  return this;
};

/**
 * My vertex shaders can apply one of two transformation models to a stamp's vertex,
 * depending on its "group" number. See Renderer.prototype.setModelMatrix2().
 * The legal values are basically "0" (default) and anything non-zero, which uses setModelMatrix2.
 * @param {number} g
 * @returns {Vertex}
 */
Vertex.prototype.setGroup = function(g) {
  this.group = g;
  return this;
};

/**
 * @returns {Vertex} a deep copy of this vertex
 */
Vertex.prototype.copy = function() {
  var copy = new Vertex();
  copy.position.set(this.position);
  copy.color.set(this.color);
  copy.group = this.group;
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

/**
 * @param {Matrix44} matrix
 * @return {Vertex} this
 */
Vertex.prototype.transformColor = function(matrix) {
  this.color.transform(matrix);
  return this;
};
