/**
 * @constructor
 * @extends {BaseWeapon}
 */
function LaserWeapon(screen) {
  BaseWeapon.call(this, screen);
}
LaserWeapon.prototype = new BaseWeapon();
LaserWeapon.prototype.constructor = LaserWeapon;


LaserWeapon.prototype.getNextFireTime = function() {
  let delay = Math.max(0, (20 - this.now() % 40));
  return this.lastFireTime + 0.6 * (0.5 + Math.random()) + delay;
};

/**
 * @override
 */
LaserWeapon.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;
  let aimVec = this.getSpirit().getAimVec();
  this.vec2d.set(aimVec).rot90Right().scale(0.2 * (Math.random() - 0.5));
  pos.add(this.vec2d);
  this.addBullet(
      pos,
      this.vec2d.set(aimVec).scaleToLength(20),
      0.5 + 0.1 * Math.random(),
      1.5 + Math.random() * 0.5
  );
  // this.screen.sounds.pew(pos, this.now());
};

LaserWeapon.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(0.5, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;

  // TODO team-based bullet making
  b.hitGroup = b.hitGroup = this.screen.getHitGroups().PLAYER_FIRE;

  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.health = 0;
  spirit.digChance = 0.06;
  spirit.bounceChance = 0;
  spirit.team = this.getSpirit.team;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

