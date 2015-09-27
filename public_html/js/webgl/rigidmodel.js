/**
 * A way to create, combine, and manipulate a 3D model in JS.
 * This is not optimized for repeated real-time use. It's meant to
 * be used during setup.
 * Generates static ModelStamp objects, which are meant to be used at runtime.
 * @constructor
 */
function RigidModel() {
  this.vertexes = [];
  this.triangles = [];
}

RigidModel.prototype.clear = function() {
  this.vertexes.length = 0;
  this.triangles.length = 0;
  return this;
};

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
    vertexMap[i] = this.addVertex(that.vertexes[i].copy());
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
 * @return {Rect} the bounding rect, or null if there are no vertexes
 */
RigidModel.prototype.getBoundingRect = function() {
  if (!this.vertexes.length) {
    return null;
  }
  var vert = this.vertexes[0];
  var rect = new Rect(vert.position.v[0], vert.position.v[1], 0, 0);
  for (var i = 1; i < this.vertexes.length; i++) {
    vert = this.vertexes[i];
    rect.coverXY(vert.position.v[0], vert.position.v[1]);
  }
  return rect;
};

/**
 * Mutates all the vertex positions in this model.
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
 * Sets all the vertex colors in this model.
 * @return {RigidModel} this
 */
RigidModel.prototype.setColorRGB = function(r, g, b) {
  for (var i = 0; i < this.vertexes.length; i++) {
    this.vertexes[i].setColorRGB(r, g, b);
  }
  return this;
};

/**
 * Mutates the vertexes by moving each towards or away from a centerpoint,
 * so they're all the same radius from it.
 * @param {Vec4} center
 * @param {number} radius
 * @return {RigidModel} this
 */
RigidModel.prototype.sphereize = function(center, radius) {
  for (var i = 0; i < this.vertexes.length; i++) {
    var p = this.vertexes[i].position;
    p.subtract(center).scaleToLength(radius).add(center);
  }
  return this;
};

/**
 * Creates a new RigidModel just like this one, but replaces all triangles with
 * four co-planer triangles covering the same area, creating a new vertex in the
 * middle of each edge. Color values for the new vertexes are the average of the
 * original two points along the edge.
 */
RigidModel.prototype.createQuadrupleTriangleModel = function() {
  var m = new RigidModel();
  function childName(index0, index1) {
    return (index0 < index1) ? index0 + "_" + index1 : index1 + "_" + index0;
  }
  // Each key is a name of a vertex - either the original parent vert index,
  // or a name created by joining two parent IDs.
  // Each value is a new model vertex index.
  var namedVerts = {};
  for (var ti = 0; ti < this.triangles.length; ti++) {
    var oldTri = this.triangles[ti];
    // copy original verts, as needed
    for (var i = 0; i < 3; i++) {
      var vi = oldTri[i];
      // map old vertex index to new one
      if (!(vi in namedVerts)) {
        namedVerts[vi] = m.addVertex(this.vertexes[vi].copy());
      }
    }
    // create children in the middle of edges, as needed
    for (var i = 0; i < 3; i++) {
      var parent0Index = oldTri[i];
      var parent1Index = oldTri[(i + 1) % 3];
      var name = childName(parent0Index, parent1Index);
      if (!(name in namedVerts)) {
        var parent0 = this.vertexes[parent0Index];
        var parent1 = this.vertexes[parent1Index];
        var newVert = parent0.copy();
        newVert.position.add(parent1.position).scale1(0.5);
        // I'm assuming alpha is always 1, so if that changes, change this to average alpha, too.
        newVert.color.add(parent1.color).scale1(0.5);
        namedVerts[name] = m.addVertex(newVert);
      }
    }
    // manually add triangles using the new vertexes
    var a = namedVerts[oldTri[0]];
    var b = namedVerts[oldTri[1]];
    var c = namedVerts[oldTri[2]];
    var ab = namedVerts[childName(oldTri[0], oldTri[1])];
    var bc = namedVerts[childName(oldTri[1], oldTri[2])];
    var ac = namedVerts[childName(oldTri[0], oldTri[2])];
    m.addTriangle(a, ab, ac);
    m.addTriangle(ab, b, bc);
    m.addTriangle(ac, bc, c);
    m.addTriangle(ab, bc, ac);
  }
  return m;
};

/**
 * Adds immutable snapshot data to GL and returns a handle to it.
 * @param gl
 * @returns {ModelStamp}
 */
RigidModel.prototype.createModelStamp = function(gl) {
  var i, positionArray = [], colorArray = [];
  for (i = 0; i < this.vertexes.length; i++) {
    var vertex = this.vertexes[i];
    for (var d = 0; d < 4; d++) {
      positionArray.push(vertex.position.v[d]);
      colorArray.push(vertex.color.v[d]);
    }
  }
  var posBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);
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

  return new ModelStamp(gl.TRIANGLES, posBuff, colorBuff, elementBuff, elementsArray.length);
};

/**
 * Creates a unit-square, with points at 1 and -1 along each dimension X and Y, with Z=0,
 * so edge-length is 2 and area is 4.
 * @returns {RigidModel}
 */
RigidModel.createSquare = function() {
  var m = new RigidModel();
  var v = [];
  for (var y = -1; y <= 1; y+= 2) {
    for (var x = -1; x <= 1; x+= 2) {
      v.push(m.addVertex(new Vertex().setPositionXYZ(x, y, 0).setColorRGB(1, 1, 1)));
    }
  }
  function face(nw, ne, sw, se) {
    m.addTriangle(v[nw], v[sw], v[ne]);
    m.addTriangle(v[se], v[ne], v[sw]);
  }
  // 2   3
  //
  // 0   1
  face(2, 3, 0, 1);
  return m;
};

/**
 * Creates an equalateral triangle, with one point on the positive Y axis and two with negative Y and varying X,
 * sized so it covers a unit circle. The highest Y is 2 and the lowest is -1.
 * @returns {RigidModel}
 */
RigidModel.createTriangle = function() {
  var m = new RigidModel();
  var top = new Vertex().setPositionXYZ(0, 2, 0).setColorRGB(1, 1, 1);
  var right = top.copy().transformPosition(new Matrix44().toRotateZOp(2*Math.PI/3));
  var left = top.copy().transformPosition(new Matrix44().toRotateZOp(-2*Math.PI/3));
  var topIndex = m.addVertex(top);
  var leftIndex = m.addVertex(left);
  var rightIndex = m.addVertex(right);
  m.addTriangle(topIndex, leftIndex, rightIndex);
  return m;
};

/**
 * Creates a unit-cube, with points at 1 and -1 along each dimension,
 * so edge-length is 2 and volume is 8.
 * @returns {RigidModel}
 */
RigidModel.createCube = function() {
  var m = new RigidModel();
  var v = [];
  for (var z = -1; z <= 1; z+= 2) {
    for (var y = -1; y <= 1; y+= 2) {
      for (var x = -1; x <= 1; x+= 2) {
        v.push(m.addVertex(new Vertex().setPositionXYZ(x, y, z).setColorRGB(1, 1, 1)));
      }
    }
  }
  function face(nw, ne, sw, se) {
    m.addTriangle(v[nw], v[sw], v[ne]);
    m.addTriangle(v[se], v[ne], v[sw]);
  }
  // 2   3
  //  6   7
  //
  // 0   1
  //  4   5
  face(4, 5, 0, 1); // bottom
  face(2, 3, 6, 7); // top
  face(6, 7, 4, 5); // front
  face(3, 2, 1, 0); // back
  face(2, 6, 0, 4); // left
  face(7, 3, 5, 1); // right
  return m;
};

/**
 * Creates a four-faced triangular pyramid, with one edge parallel to the Y axis,
 * and one edge parallel to the X axis. Edges have a length of 2.
 * @returns {RigidModel}
 */
RigidModel.createTetrahedron = function() {
  var m = new RigidModel();
  var dz = Math.sqrt(2) / 2;
  var a = m.addVertex(new Vertex().setPositionXYZ(0, 1, -dz).setColorRGB(1, 1, 1));
  var b = m.addVertex(new Vertex().setPositionXYZ(0, -1, -dz).setColorRGB(1, 1, 1));
  var c = m.addVertex(new Vertex().setPositionXYZ(1, 0, dz).setColorRGB(1, 1, 1));
  var d = m.addVertex(new Vertex().setPositionXYZ(-1, 0, dz).setColorRGB(1, 1, 1));
  m.addTriangle(a, d, c);
  m.addTriangle(a, b, d);
  m.addTriangle(a, c, b);
  m.addTriangle(b, c, d);
  return m;
};

/**
 * Creates an eight-faced shape with a vertex at 1 and -1 on every axis.
 * @returns {RigidModel}
 */
RigidModel.createOctahedron = function() {
  var m = new RigidModel();
  function v(x, y, z) {
    return m.addVertex(new Vertex().setPositionXYZ(x, y, z).setColorRGB(1, 1, 1));
  }
  var a = v(1, 0, 0);
  var b = v(-1, 0, 0);
  var c = v(0, 1, 0);
  var d = v(0, -1, 0);
  var e = v(0, 0, 1);
  var f = v(0, 0, -1);
  m.addTriangle(c, e, a);
  m.addTriangle(c, a, f);
  m.addTriangle(c, f, b);
  m.addTriangle(c, b, e);
  m.addTriangle(d, e, b);
  m.addTriangle(d, a, e);
  m.addTriangle(d, f, a);
  m.addTriangle(d, b, f);
  return m;
};
