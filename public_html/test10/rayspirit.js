/**
 * @constructor
 * @extends {Spirit}
 */
function RaySpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.vec = Vec2d.alloc();
  this.accel = Vec2d.alloc();
  this.attackVec = Vec2d.alloc();
  this.hitPos = [];
  this.mode = RaySpirit.MODE_ATTACK;
}

RaySpirit.MODE_ATTACK = 1;
RaySpirit.MODE_RETURN = 2;

RaySpirit.TIMEOUT = 0.05;

RaySpirit.prototype = new Spirit();
RaySpirit.prototype.constructor = RaySpirit;

RaySpirit.RAY_COUNT = 20;
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
    this.vec.scale(0.97);
    b.setVelAtTime(this.vec, world.now);

    var req = ScanRequest.alloc();
    req.hitGroup = 0;
    req.shape = Body.Shape.CIRCLE;
    req.rad = RaySpirit.RAY_RADUIS;
    b.getPosAtTime(world.now, req.pos);
    var resp = ScanResponse.alloc();
    var aOffset = world.now / 10;

    // return to base?
    if (req.pos.magnitude() > 300) {
      this.mode = RaySpirit.MODE_RETURN;
    }

    // gravity
    this.accel.set(req.pos).scale(this.mode == RaySpirit.MODE_RETURN ? -0.01 : -0.002);

    this.attackVec.reset();
    var closest = 2;
    for (var i = 0; i < RaySpirit.RAY_COUNT; i++) {
      var a = Math.PI * 2 * i / RaySpirit.RAY_COUNT;
      req.vel.setXY(0, RaySpirit.RAY_LENGTH).rot(a + aOffset);
      if (world.rayscan(req, resp)) {
//        this.hitPos.push(Vec2d.alloc().set(req.vel).scale(resp.timeOffset).add(req.pos));
        var other = world.getBodyByPathId(resp.pathId);
        if (other) {
          if (other.mass == Infinity) {
            this.mode = RaySpirit.MODE_ATTACK;
            if (resp.timeOffset < 0.35) {
              this.hitPos.push(Vec2d.alloc().set(req.vel).scale(resp.timeOffset).add(req.pos));
              this.accel.add(req.vel.scaleToLength(-0.8 * (1 - resp.timeOffset)));
            }
          } else if (this.mode == RaySpirit.MODE_ATTACK) {
            this.hitPos.push(Vec2d.alloc().set(req.vel).scale(resp.timeOffset).add(req.pos));
            if (resp.timeOffset < closest) {
              closest = resp.timeOffset;
              this.attackVec.set(req.vel);
            }
          }
        }
      }
    }
    if (closest <= 1) {
      this.accel.add(this.attackVec.scaleToLength(2));
    }

    this.vec.set(b.vel).add(this.accel);
    b.setVelAtTime(this.vec, world.now);
  }

  world.addTimeout(timeout.time + RaySpirit.TIMEOUT, this.id, null);
};

RaySpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
//  if(thatBody.mass != Infinity) {
//    thisBody.setVelAtTime(this.vec.set(thisBody.vel).scale(1.1), hit.time);
//  }
};
