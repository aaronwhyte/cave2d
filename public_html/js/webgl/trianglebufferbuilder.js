function TriangleBufferBuilder(gl) {
  this.gl = gl;
  this.pos = [];
  this.color = [];
  this.count = 0;
}

TriangleBufferBuilder.prototype.addRect = function(pos, pz, rectRad, red, green, blue, alpha) {
  // Two triangles form a rect.
  this.pos.push(
      pos.x-rectRad.x, pos.y-rectRad.y, pz,
      pos.x-rectRad.x, pos.y+rectRad.y, pz,
      pos.x+rectRad.x, pos.y+rectRad.y, pz,

      pos.x+rectRad.x, pos.y+rectRad.y, pz,
      pos.x+rectRad.x, pos.y-rectRad.y, pz,
      pos.x-rectRad.x, pos.y-rectRad.y, pz);
  for (var i = 0; i < 6; i++) {
    this.color.push(red, green, blue, alpha);
  }
  this.count += 2;
};

TriangleBufferBuilder.prototype.getTriangleCount = function() {
  return this.count;
};

TriangleBufferBuilder.prototype.createPositionBuff = function() {
  return createStaticGlBuff(this.gl, this.pos);
};

TriangleBufferBuilder.prototype.createColorBuff = function() {
  return createStaticGlBuff(this.gl, this.color);
};
