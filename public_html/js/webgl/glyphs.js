function Glyphs(glyphMaker) {
  this.glyphMaker = glyphMaker;
  this.stamps = {};
}

Glyphs.prototype.initStamps = function(gl, aVertexPosition, aVertexColor) {
  var r = this.glyphMaker.lineWidth / 2;
  var h = 1.5;
  var w = 1;
  var self = this;
  function g() {
    self.glyphMaker.clear();
    for (var i = 1; i < arguments.length; i+=4) {
      self.glyphMaker.addStick(arguments[i], arguments[i + 1], arguments[i + 2], arguments[i + 3]);
    }
    self.stamps[arguments[0]] = self.glyphMaker.addToRigidModel(
        new RigidModel()).createModelStamp(gl, aVertexPosition, aVertexColor);
  }
  g('A',
      -w * 1.2, -h,  -r/5, h,
      w * 1.2, -h,  r/5, h,
      -w/2, -h * 0.33, w/2, -h * 0.33);
  g('B',
      -w, h, -w, -h,
      -w, h, w * 0.33, h,
      w * 0.33, h, w * 0.33, 0,
      -w, 0, w, 0,
      w, 0, w, -h,
      w, -h, -w, -h);
  g('C',
      w * 0.5, h, -w, h,
      -w, h, -w, -h,
      -w, -h, w, -h);
  g('D',
      -w, h - r, -w, -h,
      -w, -h, w, -h,
      w, -h, w, 0,
      w - r/2, r, -w, h);
  g('E',
      w * 0.5, h, -w, h,
      -w, h, -w, -h,
      -w, -h, w, -h,
      -w, 0, w * 0.5, 0);
  g('F',
      w, h, -w, h,
      -w, h, -w, -h,
      -w, 0, w * 0.33, 0);
  g('G',
      w * 0.5, h, -w, h,
      -w, h, -w, -h,
      -w, -h, w, -h,
      w, -h, w, 0,
      w * 0.2, 0, w * 1.2, 0);
  g('H',
      -w, h, -w, -h,
      w, h, w, -h,
      w, 0, -w, 0);
  g('I',
      0, h, 0, -h,
      -w, h, w, h,
      -w, -h, w, -h);
  g('J',
      -w, -h * 0.33, -w, -h,
      -w, -h, w, -h,
      w, -h, w, h);
  g('K',
      -w, h, -w, -h,
      -w * (1 - r), -h * 0.2, w * 0.6, h * 0.6,
      -w * 0.2, 0, w, -h);
  g('L',
      -w, h, -w, -h,
      -w, -h, w, -h);
  g('M',
      -w, -h, -w, h,
      -w + r*0.6, h - r/2, -r*0.2, h * 0.33,
      -r*0.2, h * 0.33, w - r*0.6, h - r/2,
      w, h, w, -h);
  g('N',
      -w, -h, -w, h,
      -w + r/2, h - r/2, w - r/2, -h + r/2,
      w, -h, w, h);
  g('O',
      -w, h - r, -w, -h + r,
      -w + r, h, w - r, h,
      w, h - r, w, -h + r,
      -w + r, -h, w - r, -h);
  g('P',
      -w, h, -w, -h,
      -w, h, w, h,
      w, h, w, 0,
      w, 0, -w, 0);
  g('Q',
      -w, h - r, -w, -h + r,
      -w + r, h, w - r, h,
      w, h - r, w, -h + r,
      -w + r, -h, w - r, -h,
      w * 0.2, -h * 0.5, w * 1.2, -h * 1.2);
  g('R',
      -w, h, -w, -h,
      -w, h, w, h,
      w, h, w, 0,
      w, 0, -w, 0,
      0, -r, w, -h);
};
