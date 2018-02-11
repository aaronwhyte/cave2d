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
  let i, vertexMap = {};
  for (i = 0; i < that.vertexes.length; i++) {
    vertexMap[i] = this.addVertex(that.vertexes[i].copy());
  }
  for (i = 0; i < that.triangles.length; i++) {
    let thatTri = that.triangles[i];
    this.addTriangle(
        vertexMap[thatTri[0]],
        vertexMap[thatTri[1]],
        vertexMap[thatTri[2]]);
  }
  return this;
};

/**
 * @return {Rect} the bounding rect, or null if there are no vertexes
 */
RigidModel.prototype.getBoundingRect = function() {
  if (!this.vertexes.length) {
    return null;
  }
  let vert = this.vertexes[0];
  let rect = new Rect(vert.position.v[0], vert.position.v[1], 0, 0);
  for (let i = 1; i < this.vertexes.length; i++) {
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
  for (let i = 0; i < this.vertexes.length; i++) {
    this.vertexes[i].transformPosition(matrix);
  }
  return this;
};

/**
 * Sets all the vertex colors in this model.
 * @return {RigidModel} this
 */
RigidModel.prototype.setColorRGBA = function(r, g, b, a) {
  for (let i = 0; i < this.vertexes.length; i++) {
    this.vertexes[i].setColorRGBA(r, g, b, a);
  }
  return this;
};

/**
 * Sets all the vertex colors in this model.
 * @return {RigidModel} this
 */
RigidModel.prototype.setColorRGB = function(r, g, b) {
  for (let i = 0; i < this.vertexes.length; i++) {
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
  for (let i = 0; i < this.vertexes.length; i++) {
    let p = this.vertexes[i].position;
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
  let m = new RigidModel();
  function childName(index0, index1) {
    return (index0 < index1) ? index0 + "_" + index1 : index1 + "_" + index0;
  }
  // Each key is a name of a vertex - either the original parent vert index,
  // or a name created by joining two parent IDs.
  // Each value is a new model vertex index.
  let namedVerts = {};
  for (let ti = 0; ti < this.triangles.length; ti++) {
    let oldTri = this.triangles[ti];
    // copy original verts, as needed
    for (let i = 0; i < 3; i++) {
      let vi = oldTri[i];
      // map old vertex index to new one
      if (!(vi in namedVerts)) {
        namedVerts[vi] = m.addVertex(this.vertexes[vi].copy());
      }
    }
    // create children in the middle of edges, as needed
    for (let i = 0; i < 3; i++) {
      let parent0Index = oldTri[i];
      let parent1Index = oldTri[(i + 1) % 3];
      let name = childName(parent0Index, parent1Index);
      if (!(name in namedVerts)) {
        let parent0 = this.vertexes[parent0Index];
        let parent1 = this.vertexes[parent1Index];
        let newVert = parent0.copy();
        newVert.position.add(parent1.position).scale1(0.5);
        // I'm assuming alpha is always 1, so if that changes, change this to average alpha, too.
        newVert.color.add(parent1.color).scale1(0.5);
        namedVerts[name] = m.addVertex(newVert);
      }
    }
    // manually add triangles using the new vertexes
    let a = namedVerts[oldTri[0]];
    let b = namedVerts[oldTri[1]];
    let c = namedVerts[oldTri[2]];
    let ab = namedVerts[childName(oldTri[0], oldTri[1])];
    let bc = namedVerts[childName(oldTri[1], oldTri[2])];
    let ac = namedVerts[childName(oldTri[0], oldTri[2])];
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
  let i, positionArray = [], colorArray = [], groupArray = [], instanceArray = [];
  for (i = 0; i < this.vertexes.length; i++) {
    let vertex = this.vertexes[i];
    for (let d = 0; d < 4; d++) {
      positionArray.push(vertex.position.v[d]);
      colorArray.push(vertex.color.v[d]);
    }
    groupArray.push(vertex.group || 0);
    instanceArray.push(1);
  }
  let posBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionArray), gl.STATIC_DRAW);

  let colorBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

  let groupBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, groupBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groupArray), gl.STATIC_DRAW);

  let instanceBuff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceArray), gl.STATIC_DRAW);

  let elementsArray = [];
  for (i = 0; i < this.triangles.length; i++) {
    let triangle = this.triangles[i];
    for (let v = 0; v < 3; v++) {
      elementsArray.push(triangle[v]);
    }
  }
  let elementBuff = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuff);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elementsArray), gl.STATIC_DRAW);

  return new ModelStamp(gl.TRIANGLES,
      posBuff,
      colorBuff,
      groupBuff,
      elementBuff, elementsArray.length,
      instanceBuff
  );
};

/**
 * Adds 1..maxCount instances of immutable snapshot data to GL, and returns an array of handles to them.
 * So if maxCount is 3, then it will return an array of stamps:
 * [stamp with 1 instance, stamp with 2 instances, stamp with 3 instances]
 * @param gl
 * @param maxCount
 * @returns {Array.<ModelStamp>}
 */
RigidModel.prototype.createModelStampBatches = function(gl, maxCount) {
  let stamps = [];
  // Create stamp with 1 instance, then a stamp with 2 instances, etc.
  for (let instanceCount = 1; instanceCount <= maxCount; instanceCount++) {
    let positionArray = [], colorArray = [], groupArray = [], instanceArray = [];
    let elementsArray = [];
    // Repeat all the vertexes, once per instance
    for (let instanceNum = 0; instanceNum < instanceCount; instanceNum++) {
      for (let i = 0; i < this.vertexes.length; i++) {
        let srcVertex = this.vertexes[i];
        for (let d = 0; d < 4; d++) {
          positionArray.push(srcVertex.position.v[d]);
          colorArray.push(srcVertex.color.v[d]);
        }
        groupArray.push(srcVertex.group || 0);
        instanceArray.push(instanceNum);
      }
      for (let i = 0; i < this.triangles.length; i++) {
        let triangle = this.triangles[i];
        for (let v = 0; v < 3; v++) {
          // A triangle is a list of three vertex indexes.
          // Since we've repeated the vertexes with different instance nums,
          // we must offset these vertex indexes so they point at the right instance's vertexes.
          elementsArray.push(triangle[v] + this.vertexes.length * instanceNum);
        }
      }
    }
    let posBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuff);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionArray), gl.STATIC_DRAW);

    let colorBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuff);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);

    let groupBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groupBuff);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groupArray), gl.STATIC_DRAW);

    let instanceBuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuff);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceArray), gl.STATIC_DRAW);

    let elementBuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elementsArray), gl.STATIC_DRAW);

    stamps.push(new ModelStamp(gl.TRIANGLES,
        posBuff,
        colorBuff,
        groupBuff,
        elementBuff, elementsArray.length,
        instanceBuff
    ));
  }
  return stamps;
};

/**
 * Creates a unit-square, with points at 1 and -1 along each dimension X and Y, with Z=0,
 * so edge-length is 2 and area is 4.
 * @returns {RigidModel}
 */
RigidModel.createSquare = function() {
  let m = new RigidModel();
  let v = [];
  for (let y = -1; y <= 1; y+= 2) {
    for (let x = -1; x <= 1; x+= 2) {
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
  let m = new RigidModel();
  let top = new Vertex().setPositionXYZ(0, 2, 0).setColorRGB(1, 1, 1);
  let right = top.copy().transformPosition(new Matrix44().toRotateZOp(2*Math.PI/3));
  let left = top.copy().transformPosition(new Matrix44().toRotateZOp(-2*Math.PI/3));
  let topIndex = m.addVertex(top);
  let leftIndex = m.addVertex(left);
  let rightIndex = m.addVertex(right);
  m.addTriangle(topIndex, leftIndex, rightIndex);
  return m;
};

/**
 * Creates a unit-circle model made of a mesh of mostly equilateral triangles, except for those with vertexes which
 * have been pulled towards the center to prevent them from protruding outside the circle.
 * @param depth The number of createQuadrupleTriangleModel() calls to make on the starting triangle, resulting
 * in something like depth^4 triangles.
 * @returns {RigidModel}
 */

RigidModel.createCircleMesh = function(depth) {
  let model = RigidModel.createTriangle();
  for (let i = 0; i < depth; i++) {
    model = model.createQuadrupleTriangleModel();
  }
  // Remove triangles outside circle.
  let outsiders = [];
  let circleRadius = 1;
  for (let t = 0; t < model.triangles.length;) {
    let tri = model.triangles[t];
    outsiders.length = 0;
    for (let v = 0; v < 3; v++) {
      let vert = model.vertexes[tri[v]];
      if (vert.position.magnitude() > circleRadius) {
        outsiders.push(vert);
      }
    }
    if (outsiders.length == 3) {
      // All verts are outside the circle. Remove the triangle.
      model.triangles[t] = model.triangles[model.triangles.length - 1];
      model.triangles.pop();
    } else {
      // Reposition outside verts to be on the circle's edge.
      for (let o = 0; o < outsiders.length; o++) {
        outsiders[o].position.scaleToLength(circleRadius);
      }
      t++;
    }
  }
  return model;
};

RigidModel.createRingMesh = function(depth, innerRadius) {
  let model = RigidModel.createCircleMesh(depth);

  // Remove triangles inside inner circle.
  let insiders = [];
  for (let t = 0; t < model.triangles.length;) {
    let tri = model.triangles[t];
    insiders.length = 0;
    for (let v = 0; v < 3; v++) {
      let vert = model.vertexes[tri[v]];
      if (vert.position.magnitude() <= innerRadius) {
        insiders.push(vert);
      }
    }
    if (insiders.length == 3) {
      // All verts are inside ring. Remove the triangle.
      model.triangles[t] = model.triangles[model.triangles.length - 1];
      model.triangles.pop();
    } else {
      // Reposition inside verts to be on the circle's edge.
      for (let i = 0; i < insiders.length; i++) {
        insiders[i].position.scaleToLength(innerRadius);
      }
      t++;
    }
  }
  return model;
};

/**
 * Creates a model for a closed unit circle on the XY plane.
 * @param corners
 * @returns {RigidModel}
 */
RigidModel.createCircle = function(corners) {
  let m = new RigidModel(), v = [];
  for (let i = 0; i < corners; i++) {
    let a = 2 * Math.PI * i / corners;
    v.push(m.addVertex(new Vertex().setPositionXYZ(Math.sin(a), Math.cos(a), 0).setColorRGB(1, 1, 1).setGroup(0)));
  }
  let centerIndex = m.addVertex(new Vertex().setPositionXYZ(0, 0, 0).setColorRGB(1, 1, 1));
  for (let i = 0; i < corners; i++) {
    m.addTriangle(v[i], v[(i + 1) % corners], centerIndex);
  }
  return m;
};

/**
 * Creates a model from a list of Vec4s where the first is the common root of a fan,
 * and the rest are fan edge verts.
 * @param {Array.<Vec4>} vecs
 */
RigidModel.createFromFanVecs = function(vecs) {
  let m = new RigidModel();
  for (let i = 0; i < vecs.length; i++) {
    let v = new Vertex();
    v.position.set(vecs[i]);
    m.addVertex(v.setColorRGB(1, 1, 1).setGroup(0));
    if (i >= 2) {
      m.addTriangle(0, i, i - 1);
    }
  }
  return m;
};

/**
 * Creates a model for an open unit circle on the XY plane, where there are two vertexes at each position,
 * one in group 0 and one in group 1. Group 0 and Group 1 are opposite ends of this open dimensionless tube.
 * @param corners
 * @param {boolean} cap0
 * @param {boolean} cap1
 * @returns {RigidModel}
 */
RigidModel.createTube = function(corners, cap0, cap1) {
  let m = new RigidModel(), v = [], i;
  for (i = 0; i < corners; i++) {
    let a = 2 * Math.PI * i / corners;
    v.push(m.addVertex(new Vertex().setPositionXYZ(Math.sin(a), Math.cos(a), 0).setColorRGB(1, 1, 1).setGroup(0)));
    v.push(m.addVertex(new Vertex().setPositionXYZ(Math.sin(a), Math.cos(a), 0).setColorRGB(1, 1, 1).setGroup(1)));
  }
  function face(nw, ne, sw, se) {
    m.addTriangle(v[nw], v[sw], v[ne]);
    m.addTriangle(v[se], v[ne], v[sw]);
  }
  let edgeVertexCount = v.length;
  for (i = 0; i < edgeVertexCount; i += 2) {
    // 0 2
    // 1 3
    face(i, (i + 2) % edgeVertexCount, i + 1, (i + 3) % edgeVertexCount);
  }

  // cap each end?
  for (let group = 0; group < 2; group++) {
    if ((group === 0 && cap0) || (group === 1 && cap1)) {
      let centerIndex = m.addVertex(new Vertex().setPositionXYZ(0, 0, 0).setColorRGB(1, 1, 1).setGroup(group));
      for (let i = 0; i < edgeVertexCount; i += 2) {
        m.addTriangle(v[(i + group) % edgeVertexCount], v[(i + group + 2) % edgeVertexCount], centerIndex);
      }
    }
  }
  return m;
};

/**
 * Creates a model for a closed unit circle on the XY plane, where there are two vertexes at each position,
 * one in group 0 and one in group 1. Group 0 and Group 1 are opposite ends of this closed dimensionless tube.
 * @param corners
 * @returns {RigidModel}
 */
RigidModel.createCylinder = function(corners) {
  return RigidModel.createTube(corners, true, true);
};

/**
 * Creates a unit-cube, with points at 1 and -1 along each dimension,
 * so edge-length is 2 and volume is 8.
 * @returns {RigidModel}
 */
RigidModel.createCube = function() {
  let m = new RigidModel();
  let v = [];
  for (let z = -1; z <= 1; z+= 2) {
    for (let y = -1; y <= 1; y+= 2) {
      for (let x = -1; x <= 1; x+= 2) {
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
  let m = new RigidModel();
  let dz = Math.sqrt(2) / 2;
  let a = m.addVertex(new Vertex().setPositionXYZ(0, 1, -dz).setColorRGB(1, 1, 1));
  let b = m.addVertex(new Vertex().setPositionXYZ(0, -1, -dz).setColorRGB(1, 1, 1));
  let c = m.addVertex(new Vertex().setPositionXYZ(1, 0, dz).setColorRGB(1, 1, 1));
  let d = m.addVertex(new Vertex().setPositionXYZ(-1, 0, dz).setColorRGB(1, 1, 1));
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
  let m = new RigidModel();
  function v(x, y, z) {
    return m.addVertex(new Vertex().setPositionXYZ(x, y, z).setColorRGB(1, 1, 1));
  }
  let a = v(1, 0, 0);
  let b = v(-1, 0, 0);
  let c = v(0, 1, 0);
  let d = v(0, -1, 0);
  let e = v(0, 0, 1);
  let f = v(0, 0, -1);
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

RigidModel.createStatGraphSegmentPile = function(pointCount) {
  function face(nw, ne, sw, se) {
    m.addTriangle(v[nw], v[sw], v[ne]);
    m.addTriangle(v[se], v[ne], v[sw]);
  }
  let m = new RigidModel();
  let v = [];
  for (let i = 0; i < pointCount - 1; i++) {
    // create a unit square whose z is the index into the stat data
    v.length = 0;
    for (let y = -1; y <= 1; y += 2) {
      for (let x = -1; x <= 1; x += 2) {
        v.push(m.addVertex(new Vertex().setPositionXYZ(x, y, i).setColorRGB(1, 1, 1)));
      }
    }
    // 2   3
    //
    // 0   1
    face(2, 3, 0, 1);

    v.length = 0;
    for (let y = -1; y <= 1; y += 2) {
      for (let x = -1; x <= 1; x += 2) {
        // truncated hyphens on each side of the Y axis
        v.push(m.addVertex(new Vertex().setPositionXYZ(y * 0.9 + x, 0, i).setColorRGB(1, 1, 1)));
      }
    }
    // 2   3
    //
    // 0   1
    face(2, 3, 0, 1);
  }
  return m;
};
