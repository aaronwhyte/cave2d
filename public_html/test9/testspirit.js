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

TestSpirit.prototype.onTimeout = function(world, timeout) {
  for (var id in world.bodies) {
    var b = world.bodies[id];
    if (b && b.mass != Infinity) {
      this.vec.set(b.vel).rot(0.6 * (Math.random() - 0.5));
      this.vec.scale(Math.random() + 0.44);
      if (this.vec.magnitudeSquared() < 0.05) {
        b.getPosAtTime(timeout.time, this.vec).scaleToLength(-Math.random() * 10 - 5);
      }
      b.setVelAtTime(this.vec, world.now);
    }
  }
  world.addTimeout(timeout.time + TestSpirit.TIMEOUT, this.id, null);
};

TestSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
//  if (thatBody.mass == Infinity) {
//    //thisBody.setPosAtTime(thisBody.getPosAtTime(hit.time, this.vec).addXY(15 * (Math.random() - 0.5), 15 * (Math.random() - 0.5)), hit.time);
//  }
//  if (Math.random() < 0.1) {
////    world.removeBodyId(body.id);
//  } else {
//
//    //body.setVelAtTime(this.vec.set(body.vel).scale(-1), hit.time);
//  }
};
