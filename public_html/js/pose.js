/**
 * The kind of thing you need to map from model-space and world-space.
 * 4D is kind of overkill but lets not be stingy.
 * @constructor
 */
function Pose(pos, rotZ, scale) {
  this.pos = new Vec4();
  this.rotZ = 0;
  this.scale = new Vec4();
  this.reset(pos, rotZ, scale);
}

Pose.prototype.reset = function(pos, rotZ, scale) {
  this.pos.set(pos);
  this.rotZ = rotZ;
  this.scale.set(scale);
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

Pose.prototype.setToInterpolation = function(a, b, t) {
  this.pos.setToInterpolation(a.pos, b.pos, t);
  this.rot = a.rotZ * (1-t) + b.rotZ * t;
  this.scale.setToInterpolation(a.scale, b.scale, t);
};
