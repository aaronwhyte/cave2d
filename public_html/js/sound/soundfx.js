/**
 * Utils for producing sound effects positioned in 3D.
 * @param {AudioContext} audioContext
 * @constructor
 */
function SoundFx(audioContext) {
  this.ctx = audioContext;
  if (this.ctx) {
    if (!(this.ctx.createGain || this.ctx.createGainNode) || !this.ctx.createOscillator) {
      this.ctx = null;
    }
  }
  if (this.ctx) {
    this.masterGain = this.createGain();
    this.masterGain.connect(this.ctx.destination);
  }
}

SoundFx.audioContext = null;

SoundFx.getAudioContext = function() {
  if (SoundFx.audioContext != null) {
    return SoundFx.audioContext;
  } else if (typeof AudioContext !== 'undefined') {
    SoundFx.audioContext = new AudioContext();
  } else if (typeof webkitAudioContext !== 'undefined') {
    SoundFx.audioContext = new webkitAudioContext();
  }
  return SoundFx.audioContext;
};

SoundFx.prototype.createGain = function() {
  if (this.ctx.createGain) {
    return this.ctx.createGain();
  }
  if (this.ctx.createGainNode) {
    return this.ctx.createGainNode();
  }
  return null;
};

SoundFx.prototype.setListenerXYZ = function(x, y, z) {
  if (!this.ctx) return;
  this.ctx.listener.setPosition(x, y, z);
};

SoundFx.prototype.getMasterGain = function() {
  return this.masterGain;
};

/**
 * Make a simple one-shot sound.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} vol
 * @param {number} attack
 * @param {number} decay
 * @param {number} freq1
 * @param {number} freq2
 * @param {String} type Wave type string (square, sine, etc)
 */
SoundFx.prototype.sound = function(x, y, z, vol, attack, sustain, decay, freq1, freq2, type, opt_delay) {
  if (!this.ctx) return;
  var delay = opt_delay || 0;
  var c = this.ctx;
  var t0 = c.currentTime + delay;
  var t1 = t0 + attack + sustain + decay;
  var gain = this.createGain();
  if (attack) {
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  }
  gain.gain.setValueAtTime(vol, t0 + attack);
  if (sustain) {
    gain.gain.setValueAtTime(vol, t0 + attack + sustain);
  }
  if (decay) {
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + attack + sustain + decay);
  }

  var osc = c.createOscillator();
  osc.frequency.setValueAtTime(freq1, t0);
  osc.frequency.exponentialRampToValueAtTime(freq2, t0 + attack + sustain + decay);
  osc.type = type;
  if (osc.start) {
    osc.start(t0);
  } else if (osc.noteOn) {
    osc.noteOn(t0);
  }
  if (osc.stop) {
    osc.stop(t1);
  } else if (osc.noteOff) {
    osc.noteOff(t1);
  }

  var panner = c.createPanner();
  panner.setPosition(x, y, z);

  osc.connect(gain);
  gain.connect(panner);
  panner.connect(this.masterGain);
};

/**
 * Makes a sound with no attack, decay, or frequency changes.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} vol
 * @param {number} sustain
 * @param {number} freq
 * @param {String} opt_type Wave type string (square, sine, etc). Default is sine
 */
SoundFx.prototype.note = function(x, y, z, vol, sustain, freq, opt_type) {
  var type = opt_type || 'sine';
  this.sound(x, y, z, vol, 0, sustain, 0, freq, freq, type);
}

SoundFx.prototype.disconnect = function() {
  if (this.masterGain) {
    this.masterGain.gain = 0;
    this.masterGain.disconnect();
    this.masterGain = null;
  }
};

