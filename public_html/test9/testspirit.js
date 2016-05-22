/**
 * @constructor
 * @extends {Spirit}
 */
function TestSpirit() {
  Spirit.call(this);
  this.targetSprite = null;
  this.id = -1;
  this.vec = Vec2d.alloc();
}

TestSpirit.TIMEOUT = 0.5;

TestSpirit.prototype = new Spirit();
TestSpirit.prototype.constructor = TestSpirit;

var hits = 0;

TestSpirit.prototype.onTimeout = function(world, timeoutVal) {
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.mass != Infinity) {
      this.vec.set(b.vel).rot(0.6 * (Math.random() - 0.5));
      this.vec.scale(Math.random() + 0.44);
      if (this.vec.magnitudeSquared() < 0.05) {
        b.getPosAtTime(world.now, this.vec).scaleToLength(-Math.random() * 10 - 5);
      }
      b.setVelAtTime(this.vec, world.now);
    }
  }
  world.addTimeout(world.now + TestSpirit.TIMEOUT, this.id, null);
};

TestSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  if(thatBody.mass != Infinity) {
    thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(1.1), hit.time);
  }
};
