/*
This file contains the BaseItemSpirit
and also all the individual item spirit classes,
since they should all be very short.
 */

/**
 * @constructor
 * @extends {BaseSpirit}
 */
function BaseItemSpirit(screen, key) {
  BaseSpirit.call(this, screen);
  if (!screen) {
    // making a prototype
    return;
  }

  this.type = key;
  this.modelId = g5db.getModelId(key);
  this.item = new (g5db.getItemCtor(key))();

  // // temps
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.color = new Vec4(1, 1, 1);
  // this.vec2d = new Vec2d();
  // this.vec4 = new Vec4();
}
BaseItemSpirit.prototype = new BaseSpirit();
BaseItemSpirit.prototype.constructor = BaseItemSpirit;

BaseItemSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

BaseItemSpirit.FRICTION = 0.1;

BaseItemSpirit.prototype.getFriction = function() {
  return this.screen.isPlaying() ? BaseItemSpirit.FRICTION : 0.3;
};

BaseItemSpirit.prototype.getModelId = function() {
  return this.modelId;
};

BaseItemSpirit.prototype.getItem = function() {
  return this.item;
};

/**
 * Kind of a dumb specific class extender utility.
 * @param {function} childCtor
 * @param {Game5Key} key
 */
BaseItemSpirit.extend = function(childCtor, key) {
  childCtor.prototype = new BaseItemSpirit();
  childCtor.prototype.constructor = childCtor;
  childCtor.SCHEMA = BaseItemSpirit.SCHEMA;

  // bind "key" to the factory
  childCtor.factory = function(screen, pos, dir) {
    let spirit = new childCtor(screen, key);
    spirit.setColorRGB(1, 1, 1);

    let b = Body.alloc();
    b.shape = Body.Shape.CIRCLE;
    b.turnable = true;
    b.grip = 0.2;
    b.setAngPosAtTime(dir, screen.now());
    b.setPosAtTime(pos, screen.now());
    b.rad = 0.95;
    b.hitGroup = screen.getHitGroups().ITEM;
    let density = 1;
    b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
    b.moi = b.mass * b.rad * b.rad / 2;

    spirit.bodyId = screen.world.addBody(b);
    let spiritId = screen.world.addSpirit(spirit);
    b.spiritId = spiritId;

    return spiritId;
  };
};


/**
 * @constructor
 * @extends {BaseItemSpirit}
 */
function SlowShooterItemSpirit(screen) {
  BaseItemSpirit.call(this, screen, Game5Key.SLOW_SHOOTER);
}
BaseItemSpirit.extend(SlowShooterItemSpirit, Game5Key.SLOW_SHOOTER);

/**
 * @constructor
 * @extends {BaseItemSpirit}
 */
function MediumShooterItemSpirit(screen) {
  BaseItemSpirit.call(this, screen, Game5Key.MEDIUM_SHOOTER);
}
BaseItemSpirit.extend(MediumShooterItemSpirit, Game5Key.MEDIUM_SHOOTER);

/**
 * @constructor
 * @extends {BaseItemSpirit}
 */
function LaserWeaponItemSpirit(screen) {
  BaseItemSpirit.call(this, screen, Game5Key.LASER_WEAPON);
}
BaseItemSpirit.extend(LaserWeaponItemSpirit, Game5Key.LASER_WEAPON);

