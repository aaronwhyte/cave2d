/**
 * @constructor
 * @extends {BaseSpirit}
 */
function IndicatorSpirit(screen) {
  BaseSpirit.call(this, screen);
  this.type = Game4BaseScreen.SpiritType.INDICATOR;
  this.color = new Vec4().setRGBA(1, 1, 1, 1);

  this.vec2d = new Vec2d();
  this.vec2d2 = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
IndicatorSpirit.prototype = new BaseSpirit();
IndicatorSpirit.prototype.constructor = IndicatorSpirit;

IndicatorSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

/**
 * @override
 * @returns {boolean}
 */
IndicatorSpirit.prototype.isActivatable = function() {
  return true;
};

IndicatorSpirit.getJsoner = function() {
  if (!IndicatorSpirit.jsoner) {
    IndicatorSpirit.jsoner = new Jsoner(IndicatorSpirit.SCHEMA);
  }
  return IndicatorSpirit.jsoner;
};

IndicatorSpirit.prototype.toJSON = function() {
  return IndicatorSpirit.getJsoner().toJSON(this);
};

IndicatorSpirit.prototype.setFromJSON = function(json) {
  IndicatorSpirit.getJsoner().setFromJSON(json, this);
};

IndicatorSpirit.factory = function(screen, pos, dir) {
  let world = screen.world;

  let spirit = new IndicatorSpirit(screen);
  spirit.setColorRGB(1, 1, 1);
  let density = 1;

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.turnable = true;
  b.grip = 0.9;
  b.setAngPosAtTime(dir, screen.now());
  b.setPosAtTime(pos, screen.now());
  b.rad = 0.7;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.moi = b.mass * b.rad * b.rad / 2;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

IndicatorSpirit.prototype.getColor = function() {
  let lit = this.sumOfInputs() > 0;
  this.vec4.set(this.color);
  if (lit) {
    this.vec4.scale1(1.5 + 5 * Math.random());
  }
  return this.vec4;
};

IndicatorSpirit.prototype.getModelId = function() {
  return ModelIds.INDICATOR;
};