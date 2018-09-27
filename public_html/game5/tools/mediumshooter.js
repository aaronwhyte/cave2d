/**
 * @constructor
 * @extends {BaseTool}
 */
function MediumShooter(screen) {
  BaseTool.call(this, screen);
  this.type = Game5Key.MEDIUM_SHOOTER;
}
MediumShooter.prototype = new BaseTool();
MediumShooter.prototype.constructor = MediumShooter;

MediumShooter.RECOIL_FORCE = 0.5;

MediumShooter.WARM_UP_TIME = 2;
MediumShooter.COOL_DOWN_TIME = 4;

MediumShooter.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

MediumShooter.factory = function(screen, pos, dir) {
  return BaseTool.factoryHelper(screen, pos, dir, new MediumShooter(screen));
};

MediumShooter.prototype.getNextFireTime = function() {
  let throttle = MediumShooter.COOL_DOWN_TIME + 0.2 * Math.sin(2349.12983 * this.id + this.lastFireTime);
  return Math.max(this.lastFireTime + throttle, this.lastButtonDownTime + MediumShooter.WARM_UP_TIME)
};

/**
 * @override
 */
MediumShooter.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  let wielder = this.getWielderSpirit();
  if (!wielder) return;

  let now = this.now();
  let body = this.getBody();

  let aimVec = wielder.getAimVec();

  let rad = 0.5;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(body.rad - rad * 1.001);
  pos.add(this.vec2d);
  let speed = 1;
  let dist = 50;
  let vel = this.vec2d.set(aimVec).scaleToLength(speed);

  this.addBullet(pos, vel, rad, dist / speed);
  this.screen.sounds.zup(pos, now);
  this.screen.splashes.addDotSplash(now,
      vel.scaleToLength(rad * 1.5).add(pos),
      rad * (1.5 + Math.random()), 2,
      0.8, 0.8, 0.8);

  // recoil
  let forceVec = this.vec2d.set(wielder.getAimVec()).scaleToLength(-MediumShooter.RECOIL_FORCE);
  body.applyForceAtWorldPosAndTime(forceVec, pos, now);

};

MediumShooter.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(1, 1, 0);
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
  spirit.trailDuration = 1.6;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 0.2;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

