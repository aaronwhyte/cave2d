/**
 * @param sfx
 * @param viewMatrix
 * @constructor
 */
function Sounds(sfx, viewMatrix) {
  this.sfx = sfx;
  this.viewMatrix = viewMatrix;

  this.vec4 = new Vec4();
  this.vec2d = new Vec2d();
}

Sounds.prototype.getScreenPosForWorldPos = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  return this.vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
};

Sounds.prototype.wallThump = function(worldPos, mag) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var vol = Math.min(1, mag * 0.05);
  if (vol > 0.01) {
    var dur = Math.min(0.1, 0.01 * mag*mag);
    var freq = mag + 200 + 5 * Math.random();
    var freq2 = 1;
    this.sfx.sound(x, y, 0, vol, 0, 0, dur, freq, freq2, 'square');
  }
};
