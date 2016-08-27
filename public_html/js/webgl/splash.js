/**
 * A predeclared particle effect, expressed as a function of time.
 * @constructor
 */
function Splash(type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration) {
  this.type = 0;
  this.stamp = null;
  this.startPose = new Pose();
  this.endPose = new Pose();
  this.startPose2 = new Pose();
  this.endPose2 = new Pose();
  this.startColor = new Vec4();
  this.endColor = new Vec4();
  this.startTime = 0;
  this.duration = 0;
  this.reset(type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration);
}

Splash.prototype.reset = function(
    type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration) {
  this.type = type || -1;
  this.stamp = stamp || null;
  startPose ? this.startPose.set(startPose) : this.startPose.reset();
  endPose ? this.endPose.set(endPose) : this.endPose.reset();
  startPose2 ? this.startPose2.set(startPose2) : this.startPose2.reset();
  endPose2 ? this.endPose2.set(endPose2) : this.endPose2.reset();
  startColor ? this.startColor.set(startColor) : this.startColor.reset();
  endColor ? this.endColor.set(endColor) : this.endColor.reset();
  this.startTime = startTime || 0;
  this.duration = duration || 0;
  return this;
};

Splash.pool = [];

Splash.alloc = function(type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration) {
  if (Splash.pool.length) {
    return Splash.pool.pop().reset(type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration);
  }
  return new Splash(type, stamp, startPose, endPose, startPose2, endPose2, startColor, endColor, startTime, duration);
};

Splash.prototype.free = function() {
  Splash.pool.push(this);
};

Splash.SCHEMA = {
  0: "type",
  1: "startPose",
  2: "endPose",
  3: "startPose2",
  4: "endPose2",
  5: "startColor",
  6: "endColor",
  7: "startTime",
  8: "duration"
};

Splash.getJsoner = function() {
  if (!Splash.jsoner) {
    Splash.jsoner = new Jsoner(Splash.SCHEMA);
  }
  return Splash.jsoner;
};

Splash.prototype.toJSON = function() {
  return Splash.getJsoner().toJSON(this);
};

Splash.prototype.setFromJSON = function(json) {
  Splash.getJsoner().setFromJSON(json, this);
};

Splash.prototype.set = function(that) {
  this.type = that.type;
  this.stamp = that.stamp;
  this.startPose.set(that.startPose);
  this.endPose.set(that.endPose);
  this.startPose2.set(that.startPose2);
  this.endPose2.set(that.endPose2);
  this.startColor.set(that.startColor);
  this.endColor.set(that.endColor);
  this.startTime = that.startTime;
  this.duration = that.duration;
  return this;
};

Splash.prototype.isVisible = function(time) {
  return this.startTime <= time && time <= this.startTime + this.duration;
};

Splash.prototype.isExpired = function(time) {
  return this.startTime + this.duration < time;
};

Splash.tempPose = new Pose();

Splash.prototype.getModelMatrix = function(time, out) {
  Splash.tempPose.setToInterpolation(this.startPose, this.endPose, (time - this.startTime) / this.duration);
  return out.setToPose(Splash.tempPose);
};

Splash.prototype.getModelMatrix2 = function(time, out) {
  Splash.tempPose.setToInterpolation(this.startPose2, this.endPose2, (time - this.startTime) / this.duration);
  return out.setToPose(Splash.tempPose);
};

Splash.prototype.getColor = function(time, out) {
  return out.setToInterpolation(this.startColor, this.endColor, (time - this.startTime) / this.duration);
};
