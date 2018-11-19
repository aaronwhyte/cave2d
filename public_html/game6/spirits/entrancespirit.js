/**
 * @constructor
 * @extends {BaseSpirit}
 */
function EntranceSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game6Key.ENTRANCE;

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
}
EntranceSpirit.prototype = new BaseSpirit();
EntranceSpirit.prototype.constructor = EntranceSpirit;

EntranceSpirit.TIMEOUT = 2;

EntranceSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

EntranceSpirit.factory = function(screen, pos) {
  let world = screen.world;

  let spirit = new EntranceSpirit(screen);

  let b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, screen.now());
  b.rad = 4;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  spirit.bodyId = world.addBody(b);

  let spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  return spiritId;
};

EntranceSpirit.prototype.getColor = function() {
  return Renderer.COLOR_WHITE;
};

EntranceSpirit.prototype.getModelId = function() {
  return ModelId.ENTRANCE;
};
