/**
 * The kind of thing you need to map from model-space and world-space.
 * 4D is kind of overkill but lets not be stingy.
 * @constructor
 */
function Pose(opt_pos, opt_rotZ, opt_scale) {
  this.pos = new Vec4();
  this.rotZ = 0;
  this.scale = new Vec4();
  this.reset(opt_pos, opt_rotZ, opt_scale);
}

Pose.prototype.reset = function(opt_pos, opt_rotZ, opt_scale) {
  if (opt_pos) {
    this.pos.set(opt_pos);
  }
  opt_rotZ = opt_rotZ || 0;
  this.rotZ = opt_rotZ;
  if (opt_scale) {
    this.scale.set(opt_scale);
  }
  return this;
};

Pose.pool = [];

Pose.alloc = function(pos, rotZ, scale) {
  if (Pose.pool.length) {
    return Pose.pool.pop().reset(pos, rotZ, scale);
  }
  return new Pose(pos, rotZ, scale);
};

Pose.prototype.free = function() {
  Pose.pool.push(this);
};

Pose.SCHEMA = {
  0: "pos",
  1: "rotZ",
  2: "scale"
};

Pose.getJsoner = function() {
  if (!Pose.jsoner) {
    Pose.jsoner = new Jsoner(Pose.SCHEMA);
  }
  return Pose.jsoner;
};

Pose.prototype.toJSON = function() {
  return Pose.getJsoner().toJSON(this);
};

Pose.prototype.setFromJSON = function(json) {
  Pose.getJsoner().setFromJSON(json, this);
};

Pose.prototype.set = function(that) {
  this.pos.set(that.pos);
  this.rotZ = that.rotZ;
  this.scale.set(that.scale);
};

Pose.prototype.setToInterpolation = function(a, b, t) {
  this.pos.setToInterpolation(a.pos, b.pos, t);
  this.rotZ = a.rotZ * (1-t) + b.rotZ * t;
  this.scale.setToInterpolation(a.scale, b.scale, t);
};
