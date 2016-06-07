/**
 * @constructor
 * @extends {BaseWeapon}
 */
function LaserWeapon(screen, spiritId, fireHitGroup, fireTimeoutId) {
  BaseWeapon.call(this, screen, spiritId, fireHitGroup, fireTimeoutId);
  this.lastFireTime = 0;
  this.firePeriod = 1.41;
}
LaserWeapon.prototype = new BaseWeapon();
LaserWeapon.prototype.constructor = LaserWeapon;

LaserWeapon.prototype.handleInput = function(destAimX, destAimY, buttonDown) {
  BaseWeapon.prototype.handleInput.call(this, destAimX, destAimY, buttonDown);
  this.currAimVec.set(this.destAimVec);
  if (buttonDown && this.isFireReady()) {
    this.fire();
  }
};

LaserWeapon.prototype.isFireReady = function() {
  return this.lastFireTime + this.firePeriod <= this.now();
};

LaserWeapon.prototype.fire = function() {
  if (!this.buttonDown) return;
  var pos = this.getBodyPos();
  if (!pos) return;
  this.addBullet(
      pos,
      this.vec2d.set(this.currAimVec).scaleToLength(13),
      0.18 + 0.05 * Math.random(),
      3 + 0.2 * Math.random());
  var now = this.now();
  this.screen.world.addTimeout(now + this.firePeriod, this.spirit.id, this.fireTimeoutId);
  this.lastFireTime = now;
  // TODO more distinctive weapon sounds
  this.screen.soundPew(pos);
};

LaserWeapon.prototype.addBullet = function(pos, vel, rad, duration) {
  var now = this.now();
  var spirit = new BulletSpirit(this.screen);
  spirit.setModelStamp(this.screen.circleStamp);
  spirit.setColorRGB(0.5, 1, 1);
  var density = 0.1;

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.rad = rad;
  b.hitGroup = this.fireHitGroup;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = duration;
  spirit.bodyId = this.screen.world.addBody(b);

  var spiritId = this.screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  spirit.addTrailSegment();
  spirit.health = 0;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

