/**
 * @constructor
 * @extends {Spirit}
 */
function SoundSpirit(playScreen) {
  Spirit.call(this);
  this.playScreen = playScreen;
  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;

  this.type = PlayScreen.SpiritType.SOUND;
  this.color = new Vec4();
  this.sounds = [];

  this.tempBodyPos = new Vec2d();
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.turn = 0;
  this.lastSoundTime = -Infinity;
}
SoundSpirit.prototype = new Spirit();
SoundSpirit.prototype.constructor = SoundSpirit;

SoundSpirit.MEASURE_TIMEOUT = 180;

SoundSpirit.SOUND_MEASURE_TIME = 0;
SoundSpirit.SOUND_VOLUME = 1;
SoundSpirit.SOUND_ATTACK = 2;
SoundSpirit.SOUND_SUSTAIN = 3;
SoundSpirit.SOUND_DECAY = 4;
SoundSpirit.SOUND_FREQ1 = 5;
SoundSpirit.SOUND_FREQ2 = 6;
SoundSpirit.SOUND_TYPE = 7;

SoundSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color",
  4: "sounds"
};

SoundSpirit.getJsoner = function() {
  if (!SoundSpirit.jsoner) {
    SoundSpirit.jsoner = new Jsoner(SoundSpirit.SCHEMA);
  }
  return SoundSpirit.jsoner;
};


SoundSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

SoundSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

SoundSpirit.prototype.setSounds = function(sounds) {
  this.sounds = sounds;
};

SoundSpirit.prototype.onTimeout = function(world, event) {
  var body = this.getBody(world);

  // Play a sound?
  var measureTime = event.timeoutVal;
  var bodyPos = body.getPosAtTime(world.now, this.vec2d);
  var makesSound = false;
  for (var i = 0; i < this.sounds.length; i++) {
    var s = this.sounds[i];
    if (s[SoundSpirit.SOUND_MEASURE_TIME] == measureTime) {
      makesSound = true;
      this.playScreen.sfx.sound(bodyPos.x, bodyPos.y, 0,
          s[SoundSpirit.SOUND_VOLUME],
          s[SoundSpirit.SOUND_ATTACK],
          s[SoundSpirit.SOUND_SUSTAIN],
          s[SoundSpirit.SOUND_DECAY],
          s[SoundSpirit.SOUND_FREQ1],
          s[SoundSpirit.SOUND_FREQ2],
          s[SoundSpirit.SOUND_TYPE]);
      this.lastSoundTime = world.now;
      var newVel = Vec2d.alloc()
          .set(body.vel).scale(1.2)
          .addXY(0.5 * (Math.random() - 0.5), 0.5 * (Math.random() - 0.5));
      body.setVelAtTime(newVel, world.now);
      newVel.free();
    }
  }
  if (makesSound) {
    this.vec4.set(this.color).scale1(2);
    this.playScreen.addNoteSplash(bodyPos.x, bodyPos.y,
        this.vec4.v[0], this.vec4.v[1], this.vec4.v[2],
        body.rad);
  }

  // TODO: be less dumb
  var addedTimes = {};
  if (event.timeoutVal === -1) {
    // This is the start of a measure. Plan the next measure of sounds.
    world.addTimeout(world.now + SoundSpirit.MEASURE_TIMEOUT, this.id, -1);
    addedTimes[0] = true;
    for (var i = 0; i < this.sounds.length; i++) {
      var s = this.sounds[i];
      var timeoutTime = world.now + SoundSpirit.MEASURE_TIMEOUT * s[SoundSpirit.SOUND_MEASURE_TIME];
      if (!addedTimes[timeoutTime]) {
        addedTimes[timeoutTime] = true;
        world.addTimeout(timeoutTime, this.id, s[SoundSpirit.SOUND_MEASURE_TIME]);
      }
    }
  }
};

SoundSpirit.prototype.onDraw = function(world, renderer) {
  var body = this.getBody(world);
  body.getPosAtTime(world.now, this.tempBodyPos);
  var colorScale = 1+1.5*Math.max(0, Math.min(1, 1 - 6*(world.now - this.lastSoundTime)/SoundSpirit.MEASURE_TIMEOUT));
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.vec4.set(this.color).scale1(colorScale));
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(this.tempBodyPos.x, this.tempBodyPos.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));
  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();
};

SoundSpirit.prototype.getBody = function(world) {
  return world.bodies[this.bodyId];
};

SoundSpirit.prototype.toJSON = function() {
  return SoundSpirit.getJsoner().toJSON(this);
};

SoundSpirit.prototype.setFromJSON = function(json) {
  SoundSpirit.getJsoner().setFromJSON(json, this);
};

