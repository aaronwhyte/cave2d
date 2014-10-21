/**
 * @constructor
 * @extends {Spirit}
 */
function RaySpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.vec = Vec2d.alloc();
  this.hitPos = [];
}

RaySpirit.TIMEOUT = 0.1;

RaySpirit.prototype = new Spirit();
RaySpirit.prototype.constructor = RaySpirit;

RaySpirit.RAY_COUNT = 15;
RaySpirit.RAY_LENGTH = 100;
RaySpirit.RAY_RADUIS = 2;

RaySpirit.prototype.onTimeout = function(world, timeout) {
  var pos;
  while(pos = this.hitPos.pop()) {
    pos.free();
  }

  var b = world.bodies[this.bodyId];
  if (b && b.mass != Infinity) {
    this.vec.set(b.vel).rot(0.2 * (Math.random() - 0.5));
    this.vec.scale(0.98);
    if (this.vec.magnitudeSquared() < 2) {
      b.getPosAtTime(timeout.time, this.vec).scaleToLength(-Math.random() * 10 - 5).
          rot(3 * (Math.random() - 0.5));
    }
    b.setVelAtTime(this.vec, world.now);

    var req = ScanRequest.alloc();
    req.hitGroup = 0;
    req.shape = Body.Shape.CIRCLE;
    req.rad = RaySpirit.RAY_RADUIS;
    b.getPosAtTime(world.now, req.pos);
    var resp = ScanResponse.alloc();
    var aOffset = world.now / 10;
    for (var i = 0; i < RaySpirit.RAY_COUNT; i++) {
      var a = Math.PI * 2 * i / RaySpirit.RAY_COUNT;
      req.vel.setXY(0, RaySpirit.RAY_LENGTH).rot(a + aOffset);
      if (world.rayscan(req, resp)) {
        this.hitPos.push(Vec2d.alloc().set(req.vel).scale(resp.timeOffset).add(req.pos));
      }
    }
  }

  world.addTimeout(timeout.time + RaySpirit.TIMEOUT, this.id, null);
};

RaySpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  if(thatBody.mass != Infinity) {
    thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(1.1), hit.time);
  }
};
