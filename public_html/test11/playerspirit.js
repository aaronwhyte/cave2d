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
  this.aim = Vec2d.alloc();
  this.moveStick = null;
  this.aimStick = null;
  this.lastFire = 0;

  this.accelFactor = 0.2;
  this.friction = 0.1;
  this.shotSpeed = 20;
  this.shotInterval = 2;
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.TIMEOUT = 0.25;

PlayerSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.bodies[this.bodyId];

  if (b) {
    // move
    this.accel.reset();
    if (this.moveStick) {
      this.moveStick.getVal(this.accel);
      this.accel.scale(b.rad * this.accelFactor);
    }
    this.vec.set(b.vel).scale(1 - this.friction).add(this.accel);
    b.setVelAtTime(this.vec, world.now);

    // fire
    if (this.aimStick && this.lastFire + this.shotInterval <= world.now) {
      this.aimStick.getVal(this.aim);
      if (!this.aim.isZero()) {
        this.lastFire = world.now;
        this.aim.scaleToLength(this.shotSpeed).add(b.vel);
        var bulletBody = Body.alloc();
        bulletBody.shape = Body.Shape.CIRCLE;
        bulletBody.rad = b.rad * 0.75;
        bulletBody.mass = bulletBody.rad * bulletBody.rad * Math.PI;
        bulletBody.pathDurationMax = BulletSpirit.TIMEOUT;
        bulletBody.setPosAtTime(b.getPosAtTime(world.now, this.vec), world.now);
        bulletBody.setVelAtTime(this.aim, world.now);
        var bulletId = world.addBody(bulletBody);
        var bulletSpirit = BulletSpirit.alloc();
        bulletSpirit.bodyId = bulletId;
        world.addSpirit(bulletSpirit);

        bulletBody.spiritId = bulletSpirit.id;
        world.addTimeout(world.now + BulletSpirit.TIMEOUT, bulletSpirit.id);
      }
    }
  }

  world.addTimeout(world.now + PlayerSpirit.TIMEOUT, this.id, null);
};

PlayerSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
};

PlayerSpirit.prototype.setMoveStick = function(stick) {
  this.moveStick = stick;
};

PlayerSpirit.prototype.setAimStick = function(stick) {
  this.aimStick = stick;
};
