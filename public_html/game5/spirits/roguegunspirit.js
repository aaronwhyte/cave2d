/**
 * @constructor
 * @extends {BaseSpirit}
 */
function RogueGunSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game5BaseScreen.SpiritType.ROGUE_GUN;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();

  this.lastFireTime = 0;
  this.waitingForFireTimeout = false;
}
RogueGunSpirit.prototype = new BaseSpirit();
RogueGunSpirit.prototype.constructor = RogueGunSpirit;

RogueGunSpirit.FIRE_TIMEOUT_ID = 2;

RogueGunSpirit.FIRE_TIMEOUT = 2.81;

RogueGunSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "lastFireTime",
  4: "waitingForFireTimeout"
};

/**
 * @override
 * @returns {boolean}
 */
RogueGunSpirit.prototype.isActivatable = function() {
  return true;
};

RogueGunSpirit.getJsoner = function() {
  if (!RogueGunSpirit.jsoner) {
    RogueGunSpirit.jsoner = new Jsoner(RogueGunSpirit.SCHEMA);
  }
  return RogueGunSpirit.jsoner;
};

RogueGunSpirit.prototype.toJSON = function() {
  return RogueGunSpirit.getJsoner().toJSON(this);
};

RogueGunSpirit.prototype.setFromJSON = function(json) {
  RogueGunSpirit.getJsoner().setFromJSON(json, this);
};

RogueGunSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new RogueGunSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.25;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.65;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

RogueGunSpirit.prototype.onTimeout = function(world, timeoutVal) {
  BaseSpirit.prototype.onTimeout.call(this, world, timeoutVal);

  if (timeoutVal === RogueGunSpirit.FIRE_TIMEOUT_ID) {
    if (this.sumOfInputs() > 0) {
      this.fire();
      this.screen.world.addTimeout(this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT, this.id, RogueGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true; // no-op since it must already be true
    } else {
      this.waitingForFireTimeout = false;
    }
  }
};

RogueGunSpirit.prototype.getColor = function() {
  let lit = this.sumOfInputs() > 0;
  this.vec4.set(this.color);
  if (lit) {
    this.vec4.scale1(1.2);
  }
  return this.vec4;
};

RogueGunSpirit.prototype.getModelId = function() {
  return ModelIds.ROGUE_GUN;
};

RogueGunSpirit.prototype.onInputSumUpdate = function() {
  if (this.sumOfInputs() > 0) {
    let now = this.now();
    if (this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT <= now) {
      this.fire();
    }
    if (!this.waitingForFireTimeout) {
      this.screen.world.addTimeout(this.lastFireTime + RogueGunSpirit.FIRE_TIMEOUT, this.id, RogueGunSpirit.FIRE_TIMEOUT_ID);
      this.waitingForFireTimeout = true;
    }
  }
};

RogueGunSpirit.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;
  let angPos = this.getBodyAngPos();
  let speed = 2.25;
  let dist = 18 * (1 + Math.random() * 0.2);

  let rand = Math.random() - Math.random();
  let vel = this.vec2d.setXY(0, 1).rot(angPos + 0.3 * rand).scaleToLength(speed);

  let rad = 0.4;
  let bullet = this.screen.getSpiritById(this.addBullet(pos, angPos, vel, rad, dist / speed));

  // For now, only players can fire weapons.
  bullet.team = Team.PLAYER;

  this.lastFireTime = this.now();
  this.screen.sounds.bwip(pos, this.lastFireTime);
  this.screen.splashes.addDotSplash(this.now(),
      this.vec2d2.set(vel).scaleToLength(this.getBody().rad * 1.5).add(pos),
      rad * 2.5, 0.7,
      0, 1, 1);

  this.addBodyVel(vel.scale(-1 * 0.25 * bullet.getBody().mass / this.getBody().mass));
};

RogueGunSpirit.prototype.addBullet = function(pos, angPos, vel, rad, duration) {
  let now = this.now();
  let spirit = BulletSpirit.alloc(this.screen);
  spirit.setColorRGB(0.5, 1, 1);
  spirit.damage = 0.334;
  spirit.toughness = 1.5;
  spirit.trailDuration = 1.5;
  let density = 0.5;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setAngPosAtTime(angPos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.screen.getHitGroups().PLAYER_FIRE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration * 1.01;
  spirit.bodyId = this.screen.world.addBody(b);

  let spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

