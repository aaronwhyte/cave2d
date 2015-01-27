/**
 * @constructor
 */
function RigidModel() {
  this.vertexes = [];
  this.triangles = [];
  this.glPositionBuffer = null;
  this.glColorBuffer = null;
}

/**
 * @param {Vertex} vertex
 * @return {number} the new vertex's index
 */
RigidModel.prototype.addVertex = function(vertex) {
  this.vertexes.push(vertex);
  return this.vertexes.length - 1;
};

/**
 * Add the indexes of existing vertexes so the counter-clockwise face is showing.
 * @param {number} vertIndex0
 * @param {number} vertIndex1
 * @param {number} vertIndex2
 * @return {number} the new triangle's index
 */
RigidModel.prototype.addTriangle = function(vertIndex0, vertIndex1, vertIndex2) {
  this.triangles.push([vertIndex0, vertIndex1, vertIndex2]);
  return this.triangles.length - 1;
};

/**
 * Adds a deep copy of a model "that" to this model.
 * @param {RigidModel} that
 * @return {RigidModel} this
 */
RigidModel.prototype.addRigidModel = function(that) {
  // Map that's vertex indexes to their new indexes in this.
  var i, vertexMap = {};
  for (i = 0; i < that.vertexes.length; i++) {
    vertexMap[i] = this.addVertex(that[i].copy());
  }
  for (i = 0; i < that.triangles.length; i++) {
    var thatTri = that.triangles[i];
    this.addTriangle(
        vertexMap[thatTri[0]],
        vertexMap[thatTri[1]],
        vertexMap[thatTri[2]]);
  }
};

/**
 * Mutates all the vertexes in this model, using the matrix.
 * @param {Matrix44} matrix
 * @return {RigidModel} this
 */
RigidModel.prototype.transformPositions = function(matrix) {
  for (var i = 0; i < this.vertexes.length; i++) {
    this.vertexes[i].transformPosition(matrix);
  }
  return this;
};

/**
 * Adds immutable snapshot data to GL and returns a handle to it.
 * @param gl
 * @param positionAttributeName
 * @param colorAttributeName
 * @returns {ModelStamp}
 */
RigidModel.prototype.createModelStamp = function(gl, positionAttributeName, colorAttributeName) {
  var i, positionArray = [], colorArray = [];
  for (i = 0; i < this.vertexes.length; i++) {
    var vertex = this.vertexes[i];
    for (var d = 0; d < 4; d++) {
      positionArray.push(vertex.position.v[d]);
      colorArray.push(vertex.color.v[d]);
    }
  }
  var positionBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionArray), gl.STATIC_DRAW);
  var colorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

  var elementsArray = [];
  for (i = 0; i < this.triangles.length; i++) {
    var triangle = this.triangles[i];
    for (var v = 0; v < 3; v++) {
      elementsArray.push(triangle[v]);
    }
  }
  var elementBuff = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuff);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elementsArray), gl.STATIC_DRAW);

  var map = [];
  map[positionAttributeName] = positionBuff;
  map[colorAttributeName] = colorBuff;
  return new ModelStamp(gl.TRIANGLES, map, elementBuff, elementsArray.length);
};