/**
 * @constructor
 * @extends {BaseSpirit}
 */
function MineSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5Key.MINE;
  this.team = Team.NEUTRAL;

  this.color = new Vec4().setRGBA(0.8, 0.8, 0.8, 1);

  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  // combat
  this.toughness = 5;
  this.damage = 0;

  this.shrapnelHitGroup = HitGroups.NEUTRAL;
  this.retracted = false;

  this.inventory = new Inventory();
}
MineSpirit.prototype = new BaseSpirit();
MineSpirit.prototype.constructor = MineSpirit;

MineSpirit.SELF_DESTRUCT_DELAY = 10;
MineSpirit.SELF_DESTRUCT_TIMEOUT_VAL = 9876543210;

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
  let density = 5;
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
  b.elasticity = 0.1;
  b.pathDurationMax = BaseSpirit.PASSIVE_TIMEOUT * 1.1;
  b.spiritId = this.id;
  return b;
}

MineSpirit.prototype.getModelId = function () {
  return this.retracted ? ModelId.MINE_RETRACTED : ModelId.MINE;
};

MineSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (timeoutVal === MineSpirit.SELF_DESTRUCT_TIMEOUT_VAL) {
    this.die();
  } else {
    BaseSpirit.prototype.onTimeout.apply(this, arguments);
  }
};


MineSpirit.prototype.die = function() {
  let body = this.getBody();
  if (!body) {
    // what is dead cannot die
    return;
  }

  let pos = this.getBodyPos();
  let bodyRad = body.rad;
  this.sounds.playerExplode(pos);
  this.screen.addBombExplosionSplash(pos, this.color);

  // Clear some space
  this.screen.drawTerrainPill(pos, pos, bodyRad * 2.5, 1);

  // LET IT RAIN
  function r() {return 1 + Math.random() * 0.5}

  let speed, dist, bullets, dirOffset, rad;

  bullets = 8;
  dirOffset = Math.random() * 2 * Math.PI;
  rad = bodyRad * 0.9;
  for (let i = 0, n = bullets; i < n; i++) {
    speed = 0.8 * r();
    dist = 5 * r();
    let dir = dirOffset + 2 * Math.PI * i / n;
    let vel = this.vec2d.setXY(0, speed).rot(dir);
    this.addBullet(pos, vel, rad, dist / speed);
  }

  bullets = 3 + Math.floor(Math.random() * 3);
  dirOffset = Math.random() * 2 * Math.PI;
  for (let i = 0, n = bullets; i < n; i++) {
    speed = 1.2 * r();
    dist = 15 * r();
    rad = bodyRad * 0.4 * r();
    let dir = dirOffset + 2 * Math.PI * (i + 0.2 * Math.random()) / n;
    let vel = this.vec2d.setXY(0, speed).rot(dir);
    this.addBullet(pos, vel, rad, dist / speed);
  }

  this.screen.removeByBodyId(this.bodyId);
};

MineSpirit.prototype.addBullet = function(pos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(Math.random() * 0.5 + 0.5, 0.4, 0);
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
  spirit.health = 1/rad;
  spirit.damage = rad * 2;
  spirit.wallDamageMultiplier = 2;
  spirit.team = Team.NEUTRAL; // TODO configurable
  spirit.trailDuration = 2;
  spirit.headRadFraction = 1;
  spirit.tailRadFraction = 0.5;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

MineSpirit.prototype.onHitOther = function(collisionVec, mag, otherBody, otherSpirit) {
  if (this.screen.isPlaying()) {
    if (!this.retracted) {
      this.addBodyAngVel(0.1 * (Math.random() < 0.5 ? 1 : -1));
      this.retracted = true;
      this.screen.sounds.mineWarning(this.getBodyPos(), this.now());
      this.screen.world.addTimeout(
          this.now() + MineSpirit.SELF_DESTRUCT_DELAY, this.id, MineSpirit.SELF_DESTRUCT_TIMEOUT_VAL);
    }
  }
};
