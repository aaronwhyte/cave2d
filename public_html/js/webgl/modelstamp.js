/**
 * Wraps the WebGl madness so that a ready-to-draw model can be reused n times
 * with 1+n easy function calls instead of about 5+n crazy calls.
 * Only accepts vertex attributes that are in groups of four floats.
 * @param glType probably gl.TRIANGLES
 * @param vertexNameBuffMap map from attribute name to buffer pointer
 * @param indexBuff pointer to the element index buffer
 * @param indexCount the total number of index values. Ten triangles would be thirty.
 * @constructor
 */
function ModelStamp(glType, vertexNameBuffMap, indexBuff, indexCount) {
  this.glType = glType;
  this.vertexNameBuffMap = vertexNameBuffMap;
  this.indexBuff = indexBuff;
  this.indexCount = indexCount;
}

ModelStamp.prototype.prepareToDraw = function(gl) {
  for (var name in this.vertexNameBuffMap) {
    var buff = this.vertexNameBuffMap[name];
    gl.bindBuffer(gl.ARRAY_BUFFER, buff);
    gl.vertexAttribPointer(name, 4, gl.FLOAT, false, 0, 0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuff);
};

ModelStamp.prototype.draw = function(gl) {
  gl.drawElements(this.glType, this.indexCount, gl.UNSIGNED_SHORT, 0);
};
