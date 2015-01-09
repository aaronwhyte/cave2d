/**
 * @constructor
 * @extends {Spirit}
 */
function PlayerSpirit(game) {
  Spirit.call(this);
  this.game = game;
  this.bodyId = -1;
  this.id = -1;
  this.health = PlayerSpirit.MAX_HEALTH;
  this.powerup = 0;
  this.vec = new Vec2d();
  this.accel = new Vec2d();
  this.aim = new Vec2d();
  this.moveStick = null;
  this.aimStick = null;
  this.lastFire = 0;

  this.accelFactor = 0.11;
  this.friction = 0.16;
  this.shotSpeed = 2;
}
PlayerSpirit.prototype = new Spirit();
PlayerSpirit.prototype.constructor = PlayerSpirit;

PlayerSpirit.TIMEOUT = 0.25;

PlayerSpirit.MAX_HEALTH = 3;
PlayerSpirit.SHOT_INTERVAL = 10;
PlayerSpirit.MAX_POWERUP = 1.3;

PlayerSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.getBody(this.bodyId);

  if (b) {
    // move
    this.accel.reset();
    if (this.moveStick) {
      this.moveStick.getVal(this.accel);
      this.accel.scale(this.accelFactor);
    }
    this.vec.set(b.vel).scale(1 - this.friction).add(this.accel);
    b.setVelAtTime(this.vec, world.now);

    this.powerup = Math.max(0, this.powerup - 0.0015);

    // fire
    var shotInterval = PlayerSpirit.SHOT_INTERVAL * (1 - this.powerup * 0.75);
    if (this.aimStick && this.lastFire + shotInterval <= world.now) {
      this.aimStick.getVal(this.aim);
      if (!this.aim.isZero()) {
        this.lastFire = world.now;
        this.aim.scaleToLength(this.shotSpeed).add(b.vel);
        var bulletBody = Body.alloc();
        bulletBody.hitGroup = Fracas2.Group.PLAYER_BULLET;
        bulletBody.shape = Body.Shape.CIRCLE;
        bulletBody.rad = BulletSpirit.RADIUS;
        bulletBody.mass = bulletBody.rad * bulletBody.rad * Math.PI;
        bulletBody.pathDurationMax = BulletSpirit.TIMEOUT;
        bulletBody.setPosAtTime(b.getPosAtTime(world.now, this.vec), world.now);
        bulletBody.setVelAtTime(this.aim, world.now);

        var bulletSpirit = BulletSpirit.alloc(this.game);
        bulletSpirit.bounce = this.powerup * 4;
        bulletSpirit.bodyId = world.addBody(bulletBody);
        world.addSpirit(bulletSpirit);

        bulletBody.spiritId = bulletSpirit.id;
        world.addTimeout(world.now + BulletSpirit.TIMEOUT, bulletSpirit.id);
      }
    }
  }

  world.addTimeout(world.now + PlayerSpirit.TIMEOUT, this.id, null);
};

PlayerSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  var otherSpirit = world.spirits[thatBody.spiritId];
  if (otherSpirit instanceof GnomeSpirit) {
    // 30% powerup penalty when damaged
    this.powerup *= 0.7;
    this.health--;
    if (this.health <= 0) {
      return Fracas2.Reaction.DESTROY_PLAYER;
    }
  } else if (otherSpirit instanceof ExitSpirit) {
    return Fracas2.Reaction.EXIT_LEVEL;
  }
  return Fracas2.Reaction.BOUNCE;
};

PlayerSpirit.prototype.setMoveStick = function(stick) {
  this.moveStick = stick;
};

PlayerSpirit.prototype.setAimStick = function(stick) {
  this.aimStick = stick;
};

PlayerSpirit.prototype.addHealth = function() {
  if (this.health < 3) {
    this.health++;
  } else {
    this.powerup = Math.min(PlayerSpirit.MAX_POWERUP, this.powerup + 1);
  }
};

PlayerSpirit.prototype.bulletHitSomething = function() {
};

PlayerSpirit.prototype.addGold = function() {
  this.powerup = Math.min(PlayerSpirit.MAX_POWERUP, this.powerup + 0.1);
};
