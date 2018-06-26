/**
 * @constructor
 * @extends {BaseTool}
 */
function SlowShooter(screen) {
  BaseTool.call(this, screen);
}
SlowShooter.prototype = new BaseTool();
SlowShooter.prototype.constructor = SlowShooter;


SlowShooter.prototype.getNextFireTime = function() {
  let throttle = 60 + 5 * Math.sin(2349.12983 * this.id + this.lastFireTime);
  return this.lastFireTime + throttle;
};

/**
 * @override
 */
SlowShooter.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  // some aim wiggle
  let aimVec = this.getWielderSpirit().getAimVec().rot(0.1 * (Math.random() - 0.5));

  let rad = 0.7;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(this.getWielderSpirit().getBody().rad - rad * 1.001);
  pos.add(this.vec2d);

  this.addBullet(
      pos,
      this.vec2d.set(aimVec).scaleToLength(0.6),
      rad,
      200
  );
  // this.screen.sounds.pew(pos, this.now());
};

SlowShooter.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  let period = 15;
  let half = period/2;
  spirit.setColorRGB(
      1,
      0,
      0
  );
  let density = 2;

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
  spirit.digChance = 2;
  spirit.bounceChance = 0;
  spirit.team = wielder.team;
  spirit.trailDuration = 0.5;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 1;


  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

