/**
 * Base class for tools. Spirits own these and delegate management to these.
 * @param {Game5BaseScreen} screen access to sound effects, the world, etc.
 * @constructor
 */
function BaseTool(screen) {
  BaseSpirit.call(this, screen);

  this.wielderId = null;
  this.vec2d = new Vec2d();
  this.buttonDown = false;
  this.timeoutRunning = false;
  this.lastFireTime = -1000;
  this.aimVec = new Vec2d(0, 1);
}
BaseTool.prototype = new BaseSpirit();
BaseTool.prototype.constructor = BaseSpirit;

BaseTool.FIRE_TIMEOUT_ID = 'bt.f';

BaseTool.prototype.setWielderId = function(id) {
  this.wielderId = id;
};

BaseTool.prototype.getWielderSpirit = function() {
  return this.screen.getSpiritById(this.wielderId);
};

/**
 * Default implementation Override me.
 * @returns {number}
 */
BaseTool.prototype.getNextFireTime = function() {
  return this.lastFireTime + 10; // just a random default fire rate
};

BaseTool.prototype.setButtonDown = function(b) {
  this.buttonDown = b;
  if (this.buttonDown && !this.timeoutRunning) {
    // The next fire time could still be in the future.
    if (this.now() >= this.getNextFireTime()) {
      this.fire();
      this.lastFireTime = this.now();
    }
    // Either way, create the timeout to re-check
    // the button next time there's a chance to fire.
    this.updateFireTimeout();
  }
};

BaseTool.prototype.fire = function() {
  console.log('fire! (override me)');
};

BaseTool.prototype.updateFireTimeout = function() {
  this.screen.world.addTimeout(this.getNextFireTime(), this.id, BaseTool.FIRE_TIMEOUT_ID);
  this.timeoutRunning = true;
};

BaseTool.prototype.onTimeout = function(world, timeoutVal) {
  if (timeoutVal !== BaseTool.FIRE_TIMEOUT_ID) {
    return;
  }
  this.timeoutRunning = false;
  if (this.buttonDown) {
    let now = this.now();
    let nextFireTime = this.getNextFireTime();
    if (now >= nextFireTime) {
      this.fire();
      this.lastFireTime = now;
    } else {
      console.warn('early fire?', now, nextFireTime);
    }
    this.updateFireTimeout();
  }
};

BaseTool.prototype.getBody = function() {
  let s = this.getWielderSpirit();
  return s && s.getBody();
};

BaseTool.prototype.getBodyPos = function() {
  let s = this.getWielderSpirit();
  return s && s.getBodyPos();
};
