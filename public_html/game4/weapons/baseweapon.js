/**
 * Base class for weapons. Spirits own these and delegate weapon management to these.
 * @param {Game4BaseScreen} screen access to sound effects, the world, etc.
 * @param {BaseSpirit} spirit to find the body location, and to do timeouts w spiritid
 * @param {number} fireHitGroup what do the bullets hit?
 * @param {number} fireTimeoutId so the spirit can route the timeout to the weapon
 * @constructor
 */
function BaseWeapon(screen, spirit, fireHitGroup, fireTimeoutId) {
  this.screen = screen;
  this.spirit = spirit;
  this.fireHitGroup = fireHitGroup;
  this.fireTimeoutId = fireTimeoutId;
  this.currAimVec = new Vec2d(0, 1);
  this.destAimVec = new Vec2d(0, 1);
  this.vec2d = new Vec2d();
  this.buttonDown = false;
  this.timeoutRunning = false;
}

BaseWeapon.prototype.handleInput = function(destAimX, destAimY, buttonDown) {
  this.stowed = false;
  if (destAimX || destAimY) {
    this.destAimVec.setXY(destAimX, destAimY);
  }
  this.buttonDown = buttonDown;
};

BaseWeapon.prototype.onTimeout = function() {
  this.timeoutRunning = false;
};

BaseWeapon.prototype.now = function() {
  return this.screen.now();
};

BaseWeapon.prototype.getBody = function() {
  return this.spirit.getBody();
};

BaseWeapon.prototype.getBodyPos = function() {
  return this.spirit.getBodyPos();
};

