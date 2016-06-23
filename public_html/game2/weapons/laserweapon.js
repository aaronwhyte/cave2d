/**
 * @constructor
 * @extends {BaseWeapon}
 */
function LaserWeapon(screen, spiritId, fireHitGroup, fireTimeoutId) {
  BaseWeapon.call(this, screen, spiritId, fireHitGroup, fireTimeoutId);
  this.firePeriod = 1.41;
}
LaserWeapon.prototype = new BaseWeapon();
LaserWeapon.prototype.constructor = LaserWeapon;

LaserWeapon.prototype.handleInput = function(destAimX, destAimY, buttonDown) {
  BaseWeapon.prototype.handleInput.call(this, destAimX, destAimY, buttonDown);
  this.currAimVec.set(this.destAimVec);
  if (buttonDown && !this.timeoutRunning) {
    this.fire();
  }
};

LaserWeapon.prototype.fire = function() {
  if (!this.buttonDown || this.timeoutRunning) return;
  var pos = this.getBodyPos();
  if (!pos) return;
  this.vec2d.set(this.currAimVec).rot90Right().scale(0.5*Math.random() - 0.25);
  pos.add(this.vec2d);
  this.addBullet(
      pos,
      this.vec2d.set(this.currAimVec).scaleToLength(4),
      0.2 + 0.1 * Math.random(),
      7 + 2 * Math.random());
  var now = this.now();
  this.screen.world.addTimeout(now + this.firePeriod, this.spirit.id, this.fireTimeoutId);
  this.timeoutRunning = true;
  this.screen.soundPew(pos);
};

LaserWeapon.prototype.addBullet = function(pos, vel, rad, duration) {
  var now = this.now();
  var spirit = BulletSpirit.alloc(this.screen);
  spirit.setModelStamp(this.screen.circleStamp);
  spirit.setColorRGB(0.5, 1, 1);
  var density = 1;

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
  spirit.health = 1;
  spirit.digChance = 0.06;
  spirit.bounceChance = 0;

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

