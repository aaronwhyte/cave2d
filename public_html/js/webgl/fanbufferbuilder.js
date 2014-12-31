function FanBufferBuilder(gl) {
  this.gl = gl;
  this.pos = [];
  this.color = [];
  this.count = 0;
}

FanBufferBuilder.prototype.addCircle = function(pos, pz, rad, cornerCount, red, green, blue, alpha) {
  this.pos.push(pos.x, pos.y, pz);
  this.color.push(red, green, blue, alpha);
  for (var i = 0; i <= cornerCount; i++) {
    this.pos.push(
            pos.x + rad * Math.sin(2 * Math.PI * i / cornerCount),
            pos.y + rad * Math.cos(2 * Math.PI * i / cornerCount),
        pz);
    this.color.push(red, green, blue, 1);
  }
  this.count = cornerCount + 2;
};

FanBufferBuilder.prototype.getTriangleCount = function() {
  return this.count;
};

FanBufferBuilder.prototype.createPositionBuff = function() {
  return createStaticGlBuff(this.gl, this.pos);
};

FanBufferBuilder.prototype.createColorBuff = function() {
  return createStaticGlBuff(this.gl, this.color);
};
