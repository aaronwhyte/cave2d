/**
 * @constructor
 * @extends {BaseTool}
 */
function LaserWeapon(screen) {
  BaseTool.call(this, screen);
  this.type = Game6Key.LASER_WEAPON;
}
LaserWeapon.prototype = new BaseTool();
LaserWeapon.prototype.constructor = LaserWeapon;

LaserWeapon.WARM_UP_TIME = 12;
LaserWeapon.COOL_DOWN_TIME = 18;

LaserWeapon.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId",
  3: "color"
};

LaserWeapon.factory = function(screen, pos, dir) {
  return BaseTool.factoryHelper(screen, pos, dir, new LaserWeapon(screen));
};

LaserWeapon.prototype.getNextFireTime = function() {
  let throttle = LaserWeapon.COOL_DOWN_TIME + 0.1 * Math.sin(1232.7432 * this.id + this.lastFireTime);
  return Math.max(this.lastFireTime + throttle, this.lastButtonDownTime + LaserWeapon.WARM_UP_TIME);
};

/**
 * @override
 */
LaserWeapon.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  let wielder = this.getWielderSpirit();
  if (!wielder) return;

  // some aim wiggle
  let aimVec = wielder.getAimVec().rot(0.07 * (Math.random() - 0.5));

  let rad = 0.18;
  // Start the bullet just inside the front of the wielder, not in the center
  this.vec2d.set(aimVec).scaleToLength(wielder.getBody().rad - rad * 1.001);
  pos.add(this.vec2d);

  this.addBullet(
      pos,
      this.vec2d.set(aimVec).scaleToLength(20),
      rad,
      1.5 + Math.random() * 0.2
  );
  this.screen.sounds.zap(pos, this.now());
  //
  // this.screen.splashes.addDotSplash(this.now(),
  //     this.vec2d.set(aimVec).scaleToLength(rad * 1.5).add(pos),
  //     rad * (5 + Math.random()), 2,
  //     1 - 0.2 * Math.random(), 0, 0);
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
  let density = 1;

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
  spirit.damage = 1;
  spirit.team = wielder.team;
  spirit.trailDuration = 7;
  spirit.headRadFraction = 3;
  spirit.tailRadFraction = 0;

  spirit.wallDamageMultiplier = 1;
  spirit.bounceChance = 0;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, BulletSpirit.SELF_DESTRUCT_TIMEOUT_VAL);

  return spiritId;
};

/**
 * Draws the muzzle-blob that
 * grows before bursting into a laser pulse, and
 * shrinks when the laser is turned off before the next (or first) shot.
 * @override
 */
LaserWeapon.prototype.onDraw = function() {
  let pos = this.getBodyPos();
  if (!pos) return;
  this.color.setRGBA(1, 1, 1, 1);
  this.drawBody();

  let fraction;
  if (this.buttonDown) {
    // warm up - grow
    fraction = (this.now() - Math.max(this.lastButtonDownTime, this.lastFireTime)) / LaserWeapon.WARM_UP_TIME;
  } else {
    // cool down - shrink from last growth size
    fraction = (1 - (this.now() - this.lastButtonUpTime) / LaserWeapon.COOL_DOWN_TIME) *
        (this.lastButtonUpTime - Math.max(this.lastButtonDownTime, this.lastFireTime)) / LaserWeapon.WARM_UP_TIME;
  }

  let shouldWarble = this.buttonDown &&
      // this.lastFireTime + LaserWeapon.COOL_DOWN_TIME < this.now() &&
      this.now() < this.lastButtonDownTime + LaserWeapon.WARM_UP_TIME;

  if (this.warble && !shouldWarble) {
    this.warble.stop();
    this.warble = null;
  }
  if (fraction <= 0 || fraction > 1) {
    return;
  }

  if (!this.warble && shouldWarble) {
    this.warble = new Sounds.Warble(this.screen.sounds, 'square', 'sine');
    this.warble.setGain(0.1);
    this.warble.start();
  }
  if (this.warble) {
    this.warble.setGain(0.2 + 0.1 * fraction * fraction);
    this.warble.setWorldPos(this.getBodyPos());
    this.warble.setWubFreq(20 + fraction * fraction * 40);
    this.warble.setPitchFreq(100 + ((this.id * 91231) % 200) + fraction * fraction * 2000);
  }
  let dotRad = 0.3 + 0.7 * fraction;

  let dotPosition = this.vec2d.setXY(0, 1).rot(this.getBodyAngPos())
      .scaleToLength(this.getBody().rad + dotRad)
      .add(pos);
  let red = (0.5 + 0.5 * fraction) * (1 - 0.2 * Math.random());
  this.color.setRGBA(red, 0, 0, 1);

  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(dotPosition.x, dotPosition.y, 0))
      .multiply(this.mat44.toScaleOpXYZ(dotRad, dotRad, 1))
      .multiply(this.mat44.toRotateZOp(-this.getBodyAngPos()));
  this.screen.drawModel(ModelId.CIRCLE_32, this.color, this.modelMatrix);
};

LaserWeapon.prototype.die = function() {
  if (this.warble) {
    this.warble.stop();
    this.warble = null;
  }
 BaseTool.prototype.die.apply(this);
};