/**
 * @constructor
 * @extends {BaseSpirit}
 */
function MineSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5Key.MINE;
  this.team = Team.NEUTRAL;

  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  // combat
  this.toughness = 0.1;
  this.damage = 1;

  this.shrapnelHitGroup = HitGroups.NEUTRAL;

  this.inventory = new Inventory();
}
MineSpirit.prototype = new BaseSpirit();
MineSpirit.prototype.constructor = MineSpirit;

MineSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

MineSpirit.MINE_RAD = 0.8;

MineSpirit.factory = function(screen, pos, dir) {
  let spirit = new MineSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let spiritId = screen.world.addSpirit(spirit);
  let b = spirit.createBody(pos, dir);
  spirit.bodyId = screen.world.addBody(b);
  return spiritId;
};

MineSpirit.prototype.createBody = function(pos, dir) {
  let density = 1;
  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.now());
  b.setAngPosAtTime(dir, this.now());
  b.rad = MineSpirit.MINE_RAD;
  b.hitGroup = HitGroups.NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;

  b.turnable = true;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.grip = 0.3;
  b.elasticity = 0.25;
  b.pathDurationMax = MineSpirit.FRICTION_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
};

MineSpirit.prototype.die = function() {
  let pos = this.getBodyPos();
  this.sounds.playerExplode(pos);
  this.screen.addBombExplosionSplash(pos, this.color);

  // LET IT RAIN
  let rad = this.getBody().rad * 0.8;
  function r() {return 1 + Math.random() * 0.5};

  let speed = 2;
  let dist = 2;
  let bullets = 7;
  let dirOffset = Math.random() * 2 * Math.PI;
  for (let i = 0, n = bullets; i < n; i++) {
    let dir = dirOffset + 2 * Math.PI * (i + Math.random()) / n;
    let vel = this.vec2d.setXY(0, speed * r()).rot(dir);
    this.addBullet(pos, vel, rad, dist * r() / speed);
  }

  speed = 1;
  dist = 10;
  bullets = 5 + Math.floor(Math.random() * 3.5);
  dirOffset = Math.random() * 2 * Math.PI;
  rad = rad * 0.6;
  for (let i = 0, n = bullets; i < n; i++) {
    let dir = dirOffset + 2 * Math.PI * (i + Math.random()) / n;
    let vel = this.vec2d.setXY(0, speed * r()).rot(dir);
    this.addBullet(pos, vel, rad, dist * r() / speed);
  }

  this.screen.removeByBodyId(this.bodyId);
};

MineSpirit.prototype.addBullet = function(pos, vel, rad, duration) {
  console.log('mine bullet!', pos, vel, rad, duration);
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(Math.random() * 0.25 + 0.75, 0.5, 0);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;

  b.hitGroup = this.shrapnelHitGroup;

  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.health = 0.1;
  spirit.damage = 1;
  spirit.wallDamageMultiplier = 2;
  spirit.team = Team.NEUTRAL; // TODO configurable
  spirit.trailDuration = 3;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 0.5;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

