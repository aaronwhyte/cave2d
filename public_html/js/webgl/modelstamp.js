/**
 * Holds the GL values needed to prepare GL to render a model.
 * Use a RigidModel to create a ModelStamp.
 * @param glType probably gl.TRIANGLES
 * @param posBuff GL vertex position buffer, with four floats per position
 * @param colorBuff GL vertex color buffer, with four floats per position
 * @param groupBuff vertex group number buffer, with one float per position
 * @param indexBuff pointer to the element index buffer
 * @param indexCount the total number of index values. Ten triangles would be thirty.
 * @param instanceBuff vertex instance number buffer, with one float per position
 * @constructor
 */
function ModelStamp(glType, posBuff, colorBuff, groupBuff, indexBuff, indexCount, instanceBuff) {
  this.glType = glType;
  this.posBuff = posBuff;
  this.colorBuff = colorBuff;
  this.groupBuff = groupBuff;
  this.indexBuff = indexBuff;
  this.indexCount = indexCount;
  this.instanceBuff = instanceBuff;
  this.id = ModelStamp.nextId++;
}

ModelStamp.nextId = 1;


ModelStamp.prototype.prepareToDraw = function(gl, aVertexPosition, aVertexColor, aVertexGroup, aVertexInstance) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuff);
  gl.vertexAttribPointer(aVertexPosition, 4, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
  gl.vertexAttribPointer(aVertexColor, 4, gl.FLOAT, false, 0, 0);

  if (typeof aVertexGroup !== 'undefined') {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groupBuff);
    gl.vertexAttribPointer(aVertexGroup, 1, gl.FLOAT, false, 0, 0);
  }
  if (typeof aVertexInstance !== 'undefined') {
    if (!this.instanceBuff) console.log('uh oh!');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuff);
    gl.vertexAttribPointer(aVertexInstance, 1, gl.FLOAT, false, 0, 0);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuff);
};

ModelStamp.prototype.draw = function(gl) {
  gl.drawElements(this.glType, this.indexCount, gl.UNSIGNED_SHORT, 0);
};

ModelStamp.prototype.dispose = function(gl) {
  gl.deleteBuffer(this.posBuff);
  gl.deleteBuffer(this.colorBuff);
  if (this.groupBuff) gl.deleteBuffer(this.groupBuff);
  gl.deleteBuffer(this.indexBuff);
  if (this.instanceBuff) gl.deleteBuffer(this.instanceBuff);
  this.glType = null;
  this.posBuff = null;
  this.colorBuff = null;
  this.groupBuff = null;
  this.indexBuff = null;
  this.indexCount = null;
  this.instanceBuff = null;
};
