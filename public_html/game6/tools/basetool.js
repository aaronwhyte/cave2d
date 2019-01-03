/**
 * Base class for tools.
 * A tool can exist in one of three states:<ul>
 * <li>embodied, unwielded: free-floating object in the world, with a body, active/passive timeouts, friction, etc
 * <li>disembodied, wielded: wielded by another spirit
 * <li>disembodied, unwielded: in a container spirit but not doing anything. Player inventory, chest, etc
 * @param {Game6BaseScreen} screen  access to sound effects, the world, etc.
 * @extends {BaseSpirit}
 * @constructor
 */
function BaseTool(screen) {
  BaseSpirit.call(this, screen);

  this.wielderId = null;
  this.bodyId = null;

  this.vec2d = new Vec2d();
  this.buttonDown = false;
  this.timeoutRunning = false;
  this.lastFireTime = -1000;
  this.lastButtonDownTime = -1000;
  this.lastButtonUpTime = -1000;
  this.aimVec = new Vec2d(0, 1);

  this.modelMatrix = new Matrix44();
  this.mat44 = new Matrix44();
  this.vec4 = new Vec4();

  this.color = new Vec4(1, 1, 1);

  this.toughness = 1;
  this.health = 1;
  this.team = Team.NEUTRAL;
  this.damage = 0.0;

  this.isItem = true;
}
BaseTool.prototype = new BaseSpirit();
BaseTool.prototype.constructor = BaseSpirit;

BaseTool.FIRE_TIMEOUT_ID = 'bt.f';

BaseTool.factoryHelper = function(screen, pos, dir, spirit) {
  spirit.setColorRGB(1, 1, 1);
  let b = spirit.createBody(pos, Vec2d.ZERO, dir, 0);
  spirit.bodyId = screen.world.addBody(b);
  let spiritId = screen.world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

BaseTool.prototype.onDraw = function() {
  if (this.bodyId) {
    this.drawBody();
  }
};

/**
 * Tells this tool it is now wielded by another spirit.
 * The following are all illegal, and throw errors:
 * <ul>
 * <li>wielding an embodied tool
 * <li>wielding with a falsy id
 * <li>wielding a tool that is already wielded by someone else
 * </ul>
 * Wielding a tool twice with the same ID is a no-op.
 * @param wielderId
 */
BaseTool.prototype.wield = function(wielderId) {
  if (this.bodyId) {
    throw Error('wield() not allowed on an embodied tool');
  }
  if (!wielderId) {
    throw Error('falsy wielderId ' + wielderId);
  }
  if (wielderId === this.wielderId) return; // no-op
  if (this.wielderId) {
    throw Error('wield() not allowed on already wielded tool');
  }
  this.wielderId = wielderId;
};

/**
 * Indicates that no spirit is wielding it this.
 */
BaseTool.prototype.unwield = function() {
  this.wielderId = null;
  this.setButtonDown(false);
};

/**
 * Change from disembodied to embodied, adding the new body to the world.
 * Calling this on an already-embodied tool will throw an error.
 * @param {Vec2d} pos
 * @param {Vec2d} vel
 * @param {number} dir
 * @param {number} angVel
 */
BaseTool.prototype.embody = function(pos, vel, dir, angVel) {
  if (this.bodyId) {
    throw Error('cannot embody() when bodyId is already set:' + this.bodyId);
  }
  this.unwield();
  let body = this.createBody(pos, vel, dir, angVel);
  this.bodyId = this.screen.world.addBody(body);
  this.startTimeouts();
};

BaseTool.prototype.disembody = function() {
  this.screen.world.removeBodyId(this.bodyId);
  this.bodyId = null;
};

/**
 * Allocates and configures a body, but does not add it to the world.
 * @param {Vec2d} pos
 * @param {Vec2d} vel
 * @param {number} dir
 * @param {number} angVel
 */
BaseTool.prototype.createBody = function(pos, vel, dir, angVel) {
  let b = Body.alloc();
  let now = this.now();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.7;
  b.setPosAtTime(pos, now);
  b.setVelAtTime(vel, now);
  b.setAngPosAtTime(dir, now);
  b.setAngVelAtTime(angVel, now);
  b.rad = 0.95;
  b.hitGroup = HitGroups.NEUTRAL;
  let density = 1;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  b.spiritId = this.id;
  return b;
};


BaseTool.prototype.getWielderSpirit = function() {
  return this.screen.getSpiritById(this.wielderId);
};

/**
 * Default implementation. Override me.
 * @returns {number}
 */
BaseTool.prototype.getNextFireTime = function() {
  return this.lastFireTime + 10; // just an arbitrary default fire rate
};

/**
 * @param {boolean} b
 */
BaseTool.prototype.setButtonDown = function(b) {
  if (b === this.buttonDown) return;
  this.buttonDown = b;
  if (this.buttonDown) {
    this.lastButtonDownTime = this.now();
    if (!this.timeoutRunning) {
      // The next fire time could still be in the future.
      if (this.now() >= this.getNextFireTime()) {
        this.fire();
        this.lastFireTime = this.now();
      }
      // Either way, create the timeout to re-check
      // the button next time there's a chance to fire.
      this.updateFireTimeout();
    }
  } else {
    this.lastButtonUpTime = this.now();
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
  if (this.bodyId) {
    // embodied, so do body's friction and path-maintaining stuff
    BaseSpirit.prototype.onTimeout.apply(this, arguments);
  }
  if (timeoutVal === BaseTool.FIRE_TIMEOUT_ID) {
    this.timeoutRunning = false;
    if (this.buttonDown) {
      let now = this.now();
      let nextFireTime = this.getNextFireTime();
      if (now >= nextFireTime) {
        this.fire();
        this.lastFireTime = now;
      } else {
        //console.warn('early fire?', now, nextFireTime);
      }
      this.updateFireTimeout();
    }
  }
};

BaseTool.prototype.getBody = function() {
  if (this.bodyId) {
    return BaseSpirit.prototype.getBody.apply(this);
  } else {
    let s = this.getWielderSpirit();
    return s && s.getBody();
  }
};

BaseTool.prototype.getBodyPos = function() {
  if (this.bodyId) {
    return BaseSpirit.prototype.getBodyPos.apply(this);
  } else {
    let s = this.getWielderSpirit();
    return s && s.getBodyPos();
  }
};

BaseTool.prototype.getBodyAngPos = function() {
  if (this.bodyId) {
    return BaseSpirit.prototype.getBodyAngPos.apply(this);
  } else {
    let s = this.getWielderSpirit();
    return s && s.getBodyAngPos();
  }
};

BaseTool.prototype.die = function() {
  let body = this.getBody();
  let pos = this.getBodyPos();
  this.screen.splashes.addItemExplosion(
      this.now(), pos, body.rad * 1.5, this.vec4.setRGBA(1, 1, 1, 1));
  this.screen.sounds.antExplode(pos);
  this.screen.world.removeBodyId(this.bodyId);
  this.screen.world.removeSpiritId(this.id);
};