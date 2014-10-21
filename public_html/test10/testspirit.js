/**
 * @constructor
 * @extends {Spirit}
 */
function TestSpirit() {
  Spirit.call(this);
  this.id = -1;
  this.bodyId = -1;
  this.vec = Vec2d.alloc();
}

TestSpirit.TIMEOUT = 0.5;

TestSpirit.prototype = new Spirit();
TestSpirit.prototype.constructor = TestSpirit;

TestSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.bodies[this.bodyId];
  this.vec.set(b.vel).rot(0.6 * (Math.random() - 0.5));
  this.vec.scale(Math.random() + 0.44);
  if (this.vec.magnitudeSquared() < 0.5) {
    b.getPosAtTime(world.now, this.vec).scaleToLength(-Math.random() * 10 - 5);
  }
  b.setVelAtTime(this.vec, world.now);
  b.invalidatePath();
  world.addTimeout(world.now + TestSpirit.TIMEOUT, this.id, null);
};

TestSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  if(thatBody.mass != Infinity) {
    thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(1.1), hit.time);
  }
};