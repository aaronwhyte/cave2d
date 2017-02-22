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
  var vol = Math.min(1, mag * 2);
  if (vol > 0.01) {
    var dur = 0.1;
    var freq = 10 * mag + 100 + 5 * Math.random();
    this.sfx.sound(x, y, 0, vol, 0, 0, dur, freq, 2, 'square');
  }
};

Sounds.prototype.playerExplode = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  // quick rise
  this.sfx.sound(x, y, 0, 2, 0, 0.1, 0, 20, 250, 'square');

  // fading crackle
  var voices = 3;
  var attack = 0.05;
  var sustain = 0.2 * (Math.random() + 1);
  var decay = (Math.random()*0.2 + 1) * 0.3;
  for (var i = 0; i < voices; i++) {
    var freq1 = (Math.random() + i) * 10 + 40;
    var freq2 = Math.random() + 1 + i * 4;
    this.sfx.sound(x, y, 0, 1.7 / voices, attack, sustain, decay, freq1, freq2, 'square');
  }
};

Sounds.prototype.playerSpawn = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var freq = 200;
  for (var i = 0; i < 3; i++) {
    freq *= 2;
    this.sfx.sound(x, y, 0, 0.2, 0.01, 0.1, 0.15, freq, freq, 'sine', i * 0.05);
    this.sfx.sound(x, y, 0, 0.1, 0.01, 0.1, 0.15, freq+2, freq, 'square', i * 0.05);
  }
};
