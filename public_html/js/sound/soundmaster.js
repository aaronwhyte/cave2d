/**
 * @constructor
 */
function SoundEngine() {
  if (window.AudioContext) {
    this.ctx = new AudioContext();
  } else if (window.webkitAudioContext) {
    this.ctx = new webkitAudioContext();
  } else {
    this.ctx = null;
  }

  this.noises = {};
  this.nextId = 1;
}


SoundEngine.prototype.addNois