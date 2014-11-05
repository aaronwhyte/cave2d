/**
 * @constructor
 * @extends {Spirit}
 */
function PlayerSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.vec = Vec2d.alloc();
  this.accel = Vec2d.alloc();
  this.stick = null;
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.TIMEOUT = 0.5;

PlayerSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.bodies[this.bodyId];
  if (b && b.mass != Infinity) {
    if (this.stick) {
      this.stick.getVal(this.accel);
      this.accel.scale(0.8);
    }
    this.vec.set(b.vel).scale(0.92).add(this.accel);
    b.setVelAtTime(this.vec, world.now);
  }

  world.addTimeout(timeout.time + PlayerSpirit.TIMEOUT, this.id, null);
};

PlayerSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
};

PlayerSpirit.prototype.setStick = function(stick) {
  this.stick = stick;
};
