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
  let throttle = 40 + 5 * Math.sin(2349.12983 * this.id + this.lastFireTime);
  return this.lastFireTime + throttle;
};

/**
 * @override
 */
SlowShooter.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  let wielder = this.getWielderSpirit();
  let now = this.now();
  let body = this.getBody();

  // some aim wiggle
  let aimVec = wielder.getAimVec().rot(0.1 * (Math.random() - 0.5));

  let rad = 0.6;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(body.rad - rad * 1.001);
  pos.add(this.vec2d);
  let vel = this.vec2d.set(aimVec).scaleToLength(0.7);

  this.addBullet(pos, vel, rad, 100);
  this.screen.sounds.bew(pos, now);
  this.screen.splashes.addDotSplash(now,
      vel.scaleToLength(rad * 1.5).add(pos),
      rad * 3, 2,
      1, 0.9, 0.5);

  // recoil
  let forceVec = this.vec2d.set(wielder.getAimVec()).scaleToLength(-2);
  body.applyForceAtWorldPosAndTime(forceVec, pos, now);
};

SlowShooter.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(1, 0.9, 0);
  let density = 4;

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
  spirit.trailDuration = 1;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 1;


  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

