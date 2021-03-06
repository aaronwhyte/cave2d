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
  let gainNode = this.sfx.getMasterGain();
  gainNode.gain.setValueAtTime(newGain, this.now() + 0.05);
};

Sounds.prototype.now = function() {
  return this.sfx.ctx.currentTime;
};

Sounds.prototype.getMasterGain = function() {
  let gainNode = this.sfx.getMasterGain();
  return gainNode.gain.value;
};

Sounds.prototype.getScreenPosForWorldPos = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  return this.vec2d.setXY(this.vec4.v[0], this.vec4.v[1]);
};

/**
 * Detatches all nodes which silences everything.
 */
Sounds.prototype.disconnect = function() {
  this.sfx.disconnect();
};

Sounds.prototype.bwip = function(worldPos, now) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let freq = 230
      - Math.abs((now % 8) - 4) * 20
      - Math.abs((now % 200) - 100) * 0.2;
  let attack = 2/60;
  let sustain = 2/60;
  let decay = 0;//5/ 60;
  this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq, 10 * freq, 'triangle');
  this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq/4, 10 * freq/4, 'triangle');
};

Sounds.prototype.bew = function(worldPos, now) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let freq = 380
      - Math.abs((now % 8) - 4) * 10
      - Math.abs((now % 100) - 50) * 0.1;
  let freq2 = (5 + 5 * Math.random()) * freq;
  let attack = 0.2/60;
  let sustain = 2/60;
  let decay = 4/60;
  this.sfx.sound(x, y, 0, 0.5 + 0.2 * Math.random(), attack, sustain, decay, freq, freq/(20 + 20 * Math.random()), 'sawtooth');
  this.sfx.sound(x, y, 0, 0.2 + 0.1 * Math.random(), attack, sustain, decay, freq2, freq2/(20 + 20 * Math.random()), 'triangle');
};

Sounds.prototype.shotgun = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let voices = 8;
  for (let i = 0; i < voices; i++) {
    let delay = 0;
    let attack = 0;
    let sustain = 0.05 * (Math.random() + 0.01);
    let decay = (Math.random() + 1) * 0.3;
    let freq1 = Math.random() * 10 + 50;
    let freq2 = Math.random() * 10 + 1;
    this.sfx.sound(x, y, 0, 0.7, attack, sustain, decay, freq1, freq2, 'square', delay);
  }
};

Sounds.prototype.exit = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let voices = 20;
  let freq1 = 30;
  for (let i = 0; i < voices; i++) {
    let delay = 0.05 * i;
    let attack = 0;
    let sustain = 0.04;
    let decay = 0.1 * i / voices;
    freq1 *= Math.pow(2, 1/3);
    let freq2 = freq1 + (Math.random() - 0.5) * 10;
    this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq2, freq1, 'square', delay);
    this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq1*2 + Math.random(), freq2*2 + Math.random(), 'triangle', delay);
  }
};

Sounds.prototype.wallThump = function(worldPos, mag) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let vol = Math.min(1, mag * 0.3);
  if (vol > 0.15) {
    let dur = Math.clip(0.01 * mag*mag, 0.03, 0.1);
    let freq = Math.max(50, mag + 200 + 5 * Math.random());
    let freq2 = 1;
    this.sfx.sound(x, y, 0, vol, 0, 0, dur, freq, freq2, 'square');
  }
};

Sounds.prototype.shieldThump = function(worldPos, mag) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let vol = Math.min(1, mag * 1.6);
  if (vol > 0.01) {
    let dur = 0.07;
    let freq  = 10 * mag + 500;
    let freq2 = freq + (Math.random() - 0.5) * 10 * mag;
    this.sfx.sound(x, y, 0, vol, 0, dur, 0, freq, freq2, 'sawtooth');
    this.sfx.sound(x, y, 0, vol, 0, dur, 0, freq/8, freq2/8, 'square');
  }
};

Sounds.prototype.wallDamage = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let sustain = 0.02 * (Math.random() + 0.5);
  let decay = 0;
  let attack = sustain * 2;
  let freq1 = 2000 + 10 * (Math.random() + 0.5);
  let freq2 = 100;
  this.sfx.sound(x, y, 0, 0.4, attack, sustain, decay, freq1, freq2, 'square');
};

Sounds.prototype.antExplode = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
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
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  // quick rise
  this.sfx.sound(x, y, 0, 2, 0, 0.1, 0, 20, 250, 'square');

  // fading crackle
  let voices = 2;
  let attack = 0;
  let sustain = 0.2 * (Math.random() + 1);
  let decay = (Math.random()*0.2 + 1) * 0.6;
  for (let i = 0; i < voices; i++) {
    let freq1 = (Math.random() + i) * 10 + 40;
    let freq2 = Math.random() + 1 + i * 4;
    this.sfx.sound(x, y, 0, 1.7, attack, sustain, decay, freq1, freq2, 'square');
  }
};

Sounds.prototype.playerSpawn = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let freq = 100;
  for (let i = 0; i < 5; i++) {
    freq *= 2;
    this.sfx.sound(x, y, 0, 0.2, 0.01, 0.1, 0.15, freq, freq, 'sine', i * 0.05);
    this.sfx.sound(x, y, 0, 0.1, 0.01, 0.1, 0.15, freq+2, freq, 'square', i * 0.05);
  }
};

Sounds.prototype.playerKickHum = function(worldPos) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let freq = 220 + (Math.random() - 0.5) * 2;
  let attack = 0.07;
  let sustain = 0;
  let decay = 0.05;
  let freq2 = freq + (Math.random() - 0.5) * 10;
  this.sfx.sound(x, y, 0, 0.6, attack, sustain, decay, freq, freq2, 'sawtooth');
};



Sounds.prototype.playerGrab = function(worldPos, df) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let div = df * 0.5 + 0.5;
  let freq = 220 / div;
  let freq2 = freq * 2;
  let attack = 0.01;
  let sustain = 0;
  let decay = 0.07;
  this.sfx.sound(x, y, 0, 0.4, attack, sustain, decay * 2, freq, freq2, 'sawtooth');
  this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq * 4, freq2 * 4, 'sine');
};


Sounds.prototype.playerRelease = function(worldPos, df) {
  let screenPos = this.getScreenPosForWorldPos(worldPos);
  let x = screenPos.x;
  let y = screenPos.y;
  let div = df * 0.5 + 0.5;
  let freq = 2 * 220 / div;
  let freq2 = freq / 4;
  let attack = 0.07;
  let sustain = 0;
  let decay = 0.01;
  this.sfx.sound(x, y, 0, 0.4, attack, sustain, decay * 2, freq, freq2, 'sawtooth');
  this.sfx.sound(x, y, 0, 0.3, attack, sustain, decay, freq * 4, freq2 * 4, 'sine');
};



/**
 * @constructor
 */
Sounds.PlayerSeekHum = function(sounds) {
  this.sounds = sounds;
  this.sfx = sounds.sfx;
  let gp = this.sfx.createGainAndPanner();
  this.gain = gp.gain;
  this.panner = gp.panner;
  if (this.gain) {
    this.wobbleGain = this.sfx.createGain();
    this.wobbleGain.connect(this.gain);

    this.gainOsc = this.sfx.createOscillator();
    this.gainOsc.type = 'sine';
    this.gainOsc.connect(this.wobbleGain.gain);

    this.pitchOsc = this.sfx.createOscillator();
    this.pitchOsc.type = 'sawtooth';
    this.pitchOsc.connect(this.wobbleGain);
  }
};

Sounds.PlayerSeekHum.prototype.start = function() {
  this.gain.gain.setValueAtTime(0, this.sfx.ctx.currentTime);
  this.gain.gain.linearRampToValueAtTime(0.3, this.sfx.ctx.currentTime + 0.1);
  this.pitchOsc.start();
  this.gainOsc.start();
};

Sounds.PlayerSeekHum.prototype.stop = function(g) {
  let t = this.soon();
  this.gain.gain.linearRampToValueAtTime(0, t);
  this.pitchOsc.stop(t);
  this.gainOsc.stop(t);
};

Sounds.PlayerSeekHum.prototype.soon = function() {
  return this.sfx.ctx.currentTime + 0.04;
};

Sounds.PlayerSeekHum.prototype.setGain = function(x) {
  this.gain.gain.linearRampToValueAtTime(x, this.soon());
};

Sounds.PlayerSeekHum.prototype.setDistanceFraction = function(df) {
  let baseWub = 10;
  if (df >= 1) {
    this.setPitchFreq(220 - (Math.random() - 0.5) * 20);
    this.setWubFreq(baseWub);
  } else {
    let div = df * 0.5 + 0.5;
    // Max pitch is about 440 Hz, max wub is about 20.
    this.setPitchFreq(220 / div);
    this.setWubFreq(baseWub / div);
  }
};

Sounds.PlayerSeekHum.prototype.setPitchFreq = function(x) {
  this.pitchOsc.frequency.linearRampToValueAtTime(x, this.soon());
};

Sounds.PlayerSeekHum.prototype.setWubFreq = function(x) {
  this.gainOsc.frequency.linearRampToValueAtTime(x, this.soon());
};

Sounds.PlayerSeekHum.prototype.setWorldPos = function(worldPos) {
  let screenPos = this.sounds.getScreenPosForWorldPos(worldPos);
  this.panner.setPosition(screenPos.x, screenPos.y, 0);
};
