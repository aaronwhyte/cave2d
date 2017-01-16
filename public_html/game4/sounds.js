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

Sounds.prototype.setMasterGain = function(newGain) {
  var gainNode = this.sfx.getMasterGain();
  gainNode.gain.value = newGain;
};

Sounds.prototype.getMasterGain = function(newGain) {
  var gainNode = this.sfx.getMasterGain();
  return gainNode.gain.value;
};

Sounds.prototype.getScreenPosForWorldPos = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  return this.vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
};


Sounds.prototype.pew = function(worldPos, now) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var freq = 230
      - Math.abs((now % 8) - 4) * 20
      - Math.abs((now % 200) - 100) * 0.2;
  var attack = 2/60;
  var sustain = 2/60;
  var decay = 0;//5/ 60;
  this.sfx.sound(x, y, 0, 0.2, attack, sustain, decay, freq, 10 * freq, 'triangle');
  this.sfx.sound(x, y, 0, 0.2, attack, sustain, decay, freq/4, 10 * freq/4, 'triangle');
};

Sounds.prototype.shotgun = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var voices = 8;
  for (var i = 0; i < voices; i++) {
    var delay = 0;
    var attack = 0;
    var sustain = 0.05 * (Math.random() + 0.01);
    var decay = (Math.random() + 1) * 0.3;
    var freq1 = Math.random() * 10 + 50;
    var freq2 = Math.random() * 10 + 1;
    this.sfx.sound(x, y, 0, 0.7, attack, sustain, decay, freq1, freq2, 'square', delay);
  }
};

Sounds.prototype.exit = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var voices = 20;
  var freq1 = 30;
  for (var i = 0; i < voices; i++) {
    var delay = 0.05 * i;
    var attack = 0;
    var sustain = 0.04;
    var decay = 0.1 * i / voices;
    freq1 *= Math.pow(2, 1/3);
    var freq2 = freq1 + (Math.random() - 0.5) * 10;
    this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq2, freq1, 'square', delay);
    this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq1*2 + Math.random(), freq2*2 + Math.random(), 'triangle', delay);
  }
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

Sounds.prototype.shieldThump = function(worldPos, mag) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var vol = Math.min(1, mag * 1.6);
  if (vol > 0.01) {
    var dur = 0.07;
    var freq  = 10 * mag + 500;
    var freq2 = freq + (Math.random() - 0.5) * 10 * mag;
    this.sfx.sound(x, y, 0, vol, 0, dur, 0, freq, freq2, 'sawtooth');
    this.sfx.sound(x, y, 0, vol, 0, dur, 0, freq/8, freq2/8, 'square');
  }
};

Sounds.prototype.wallDamage = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var sustain = 0.02 * (Math.random() + 0.5);
  var decay = 0;
  var attack = sustain * 2;
  var freq1 = 2000 + 10 * (Math.random() + 0.5);
  var freq2 = 100;
  this.sfx.sound(x, y, 0, 0.4, attack, sustain, decay, freq1, freq2, 'square');
};

Sounds.prototype.antExplode = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  this.sfx.sound(x, y, 0, 1,
      0, 0.2, (Math.random() + 1) * 0.1,
          Math.random() * 30 + 200, 3,
      'square');
  this.sfx.sound(x, y, 0, 1,
      0, 0.2, (Math.random() + 1) * 0.1,
          Math.random() * 30 + 230, 3,
      'square');
};

Sounds.prototype.playerExplode = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  // quick rise
  this.sfx.sound(x, y, 0, 2, 0, 0.1, 0, 20, 250, 'square');

  // fading crackle
  var voices = 2;
  var attack = 0;
  var sustain = 0.2 * (Math.random() + 1);
  var decay = (Math.random()*0.2 + 1) * 0.6;
  for (var i = 0; i < voices; i++) {
    var freq1 = (Math.random() + i) * 10 + 40;
    var freq2 = Math.random() + 1 + i * 4;
    this.sfx.sound(x, y, 0, 1.7, attack, sustain, decay, freq1, freq2, 'square');
  }
};

Sounds.prototype.playerSpawn = function(worldPos) {
  var screenPos = this.getScreenPosForWorldPos(worldPos);
  var x = screenPos.x;
  var y = screenPos.y;
  var freq = 100;
  for (var i = 0; i < 5; i++) {
    freq *= 2;
    this.sfx.sound(x, y, 0, 0.2, 0.01, 0.1, 0.15, freq, freq, 'sine', i * 0.05);
    this.sfx.sound(x, y, 0, 0.1, 0.01, 0.1, 0.15, freq+2, freq, 'square', i * 0.05);
  }
};
