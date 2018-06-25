/**
 * @constructor
 * @extends {BaseTool}
 */
function LaserWeapon(screen) {
  BaseTool.call(this, screen);
}
LaserWeapon.prototype = new BaseTool();
LaserWeapon.prototype.constructor = LaserWeapon;


LaserWeapon.prototype.getNextFireTime = function() {
  // let throttle = 0.9 + 0.1 * Math.sin(1232.7432 * this.id + this.lastFireTime);
  // let throttledTime = this.lastFireTime + throttle;
  // let calcDelayFromTime = Math.max(this.now(), throttledTime);
  // let delay = Math.max(0, 24 - (calcDelayFromTime + this.id) % 32);
  // return calcDelayFromTime + delay;

  let throttle = 1.35 + 0.1 * Math.sin(1232.7432 * this.id + this.lastFireTime);
  return this.lastFireTime + throttle;
};

/**
 * @override
 */
LaserWeapon.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  // some aim wiggle
  let aimVec = this.getWielderSpirit().getAimVec().rot(0.01 * (Math.random() - 0.5));

  let rad = 0.17;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(this.getWielderSpirit().getBody().rad - rad * 1.001);
  pos.add(this.vec2d);

  this.addBullet(
      pos,
      this.vec2d.set(aimVec).scaleToLength(20),
      rad,
      1.5 + Math.random() * 0.2
  );
  // this.screen.sounds.pew(pos, this.now());
};

LaserWeapon.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  let period = 15;
  let half = period/2;
  spirit.setColorRGB(
      0.8 + 0.2 * Math.abs((now + this.id) % period - half) / half,
      0,
      0
  );
  let density = 0.1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;

  let wielder = this.getWielderSpirit();
  b.hitGroup = this.getFireHitGroupForTeam(wielder.team);

  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.health = 0;
  spirit.damage = 1;
  spirit.digChance = 0;
  spirit.bounceChance = 0;
  spirit.team = wielder.team;
  spirit.trailDuration = 1.5;
  spirit.headRadFraction = 2;
  spirit.tailRadFraction = 2;


  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

