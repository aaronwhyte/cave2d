/**
 * Wraps the WebGl madness so that a ready-to-draw model can be reused n times
 * with 1+n easy function calls instead of about 5+n crazy calls.
 * Only accepts vertex attributes that are in groups of four floats.
 * @param glType probably gl.TRIANGLES
 * @param indexBuff pointer to the element index buffer
 * @param indexCount the total number of index values. Ten triangles would be thirty.
 * @constructor
 */
function ModelStamp(glType, posAttrib, posBuff, colorAttrib, colorBuff, indexBuff, indexCount) {
  this.glType = glType;
  this.posAttrib = posAttrib;
  this.posBuff = posBuff;
  this.colorAttrib = colorAttrib;
  this.colorBuff = colorBuff;
  this.indexBuff = indexBuff;
  this.indexCount = indexCount;
}

ModelStamp.prototype.prepareToDraw = function(gl) {
  gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuff);
  gl.vertexAttribPointer(this.posAttrib, 4, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuff);
  gl.vertexAttribPointer(this.colorAttrib, 4, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuff);
};

ModelStamp.prototype.draw = function(gl) {
  gl.drawElements(this.glType, this.indexCount, gl.UNSIGNED_SHORT, 0);
};
