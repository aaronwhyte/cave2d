/**
 * @constructor
 * @extends {BaseWeapon}
 */
function ShotgunWeapon(screen, spiritId, fireHitGroup, fireTimeoutId) {
  BaseWeapon.call(this, screen, spiritId, fireHitGroup, fireTimeoutId);
  this.lastFireTime = 0;
  this.firePeriod = 20;
  this.shots = 10;
}
ShotgunWeapon.prototype = new BaseWeapon();
ShotgunWeapon.prototype.constructor = ShotgunWeapon;

ShotgunWeapon.prototype.handleInput = function(destAimX, destAimY, buttonDown) {
  BaseWeapon.prototype.handleInput.call(this, destAimX, destAimY, buttonDown);
  this.currAimVec.set(this.destAimVec);
  if (buttonDown && this.isFireReady()) {
    this.fire();
  }
};

ShotgunWeapon.prototype.isFireReady = function() {
  return this.lastFireTime + this.firePeriod <= this.now();
};

ShotgunWeapon.prototype.fire = function() {
  if (!this.buttonDown) return;
  var pos = this.getBodyPos();
  if (!pos) return;
  for (var i = 0; i < this.shots; i++) {
    var angle = 0.25 * Math.PI * (i - (this.shots - 1) / 2) / this.shots;
    this.addBullet(
        pos,
        this.vec2d.set(this.currAimVec)
            .scaleToLength(2.3 + 0.5*Math.random())
            .rot(angle + 0.05 * (Math.random()-0.5)),
        0.3,
        7 +2*Math.random());
  }
  var now = this.now();
  this.screen.world.addTimeout(now + this.firePeriod, this.spirit.id, this.fireTimeoutId);
  this.lastFireTime = now;
  // TODO more distinctive weapon sounds
  this.screen.soundPew(pos);
};

ShotgunWeapon.prototype.addBullet = function(pos, vel, rad, duration) {
  var now = this.now();
  var spirit = new BulletSpirit(this.screen);
  spirit.setModelStamp(this.screen.circleStamp);
  spirit.setColorRGB(1, 1, 0.5);
  var density = 20;

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

  // bullet self-destruct timeout
  this.screen.world.addTimeout(now + duration, spiritId, 0);

  return spiritId;
};

