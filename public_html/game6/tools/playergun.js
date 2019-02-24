/**
 * @constructor
 * @extends {BaseTool}
 */
function PlayerGun(screen) {
  BaseTool.call(this, screen);
  this.type = Game6Key.PLAYER_GUN;
}
PlayerGun.prototype = new BaseTool();
PlayerGun.prototype.constructor = PlayerGun;

PlayerGun.RECOIL_FORCE = -1.5;

PlayerGun.prototype.getNextFireTime = function() {
  let throttle = 2 * (1 + 0.05 * Math.sin(2349.12983 * this.id + this.lastFireTime));
  return this.lastFireTime + throttle;
};

/**
 * @override
 */
PlayerGun.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  let wielder = this.getWielderSpirit();
  let now = this.now();
  let body = this.getBody();

  let aimVec = wielder.getAimVec();

  let rad = 0.4;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(body.rad - rad * 1.001);
  pos.add(this.vec2d);
  let dist = 20;
  let speed = 3;
  let vel = this.vec2d.set(aimVec).scaleToLength(speed).rot(0.1 * (Math.random() - 0.5));

  this.addBullet(pos, vel, rad, dist / speed);
  this.screen.sounds.zup(pos, now);
  this.screen.splashes.addDotSplash(now,
      vel.scaleToLength(rad * 1.5).add(pos),
      rad * (1.5 + Math.random()), 2,
      0.8, 0.8, 0.8);

  // recoil
  if (PlayerGun.RECOIL_FORCE) {
    let forceVec = this.vec2d.set(wielder.getAimVec()).scaleToLength(PlayerGun.RECOIL_FORCE);
    body.applyForceAtWorldPosAndTime(forceVec, pos, now);
  }
};

PlayerGun.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(1, 1, 0);
  let density = 2;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.grip = 0.9;
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

  spirit.wallDamageMultiplier = 0;
  spirit.bounceChance = 0;
  spirit.team = wielder.team;
  spirit.trailDuration = 1;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 0.5;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

