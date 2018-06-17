/**
 * Base class for weapons. Spirits own these and delegate weapon management to these.
 * @param {Game5BaseScreen} screen access to sound effects, the world, etc.
 * @constructor
 */
function BaseWeapon(screen) {
  BaseSpirit.call(this, screen);

  this.wielderId = null;
  this.vec2d = new Vec2d();
  this.buttonDown = false;
  this.timeoutRunning = false;
  this.lastFireTime = -1000;
  this.aimVec = new Vec2d(0, 1);
}

/*
  - setWielder(spiritId) to read team? Or just setTeam? Changing spirits releases trigger I guess
  - setRateMultiplier(something around 1) nextFireTime = lastFireTime + fireDelay / rateMultiplier
  - trigger API: down, up. Call down and then up immediately for one-time shot.
  - read owner body's pos, vel, angpos, angvel when firing
  - manage sounds, graphics, and actual fire effect such as creating projectiles
  - enforce rate-of-fire. Remember last fire time.
  - maybe draw, also based on owner body
  - expose properties like shotSpeed, shotSpread, shotRange, inaccuracy, splashRadius, for general aiming/firing alg.
 */

BaseWeapon.prototype.setWielderId = function(id) {
  this.wielderId = id;
};

BaseWeapon.prototype.getSpirit = function() {
  return this.screen.getSpiritById(this.wielderId);
};

/**
 * Default implementation Override me.
 * @returns {number}
 */
BaseWeapon.prototype.getNextFireTime = function() {
  return this.lastFireTime + 10; // just a random default fire rate
};

BaseWeapon.prototype.setButtonDown = function(b) {
  this.buttonDown = b;
  if (this.buttonDown && !this.timeoutRunning) {
    this.fire();
    this.updateFireTimeout();
  }
};

BaseWeapon.prototype.fire = function() {
  console.log('fire! (override me)');
};

BaseWeapon.prototype.updateFireTimeout = function() {
  this.lastFireTime = this.now();
  this.screen.world.addTimeout(this.getNextFireTime(), this.id, -1);
};

BaseWeapon.prototype.onTimeout = function() {
  this.timeoutRunning = false;
  if (this.buttonDown) {
    this.fire();
    this.updateFireTimeout();
  }
};

BaseWeapon.prototype.now = function() {
  return this.screen.now();
};

BaseWeapon.prototype.getBody = function() {
  let s = this.getSpirit();
  return s && s.getBody();
};

BaseWeapon.prototype.getBodyPos = function() {
  let s = this.getSpirit();
  return s && s.getBodyPos();
};
