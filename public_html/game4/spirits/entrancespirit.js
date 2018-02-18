/**
 * @constructor
 * @extends {BaseSpirit}
 */
function EntranceSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game4BaseScreen.SpiritType.ENTRANCE;

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
  let density = 1;

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
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

EntranceSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  this.maybeStop();
  let body = this.getBody();
  body.pathDurationMax = Infinity;
  // If the body is being moved (because it's in the editor), slow it to a stop.
  if (!body.vel.isZero()) {
    let friction = 0.5;
    let newVel = this.vec2d.set(body.vel).scale(1 - friction);
    body.setVelAtTime(newVel, world.now);
  }
  world.addTimeout(world.now + EntranceSpirit.TIMEOUT, this.id, -1);

  // if (this.screen.isPlaying() && Math.random() < 1) {
  //   this.screen.addPortalMoteSplash(this.getBodyPos(), 0, body.rad);
  // }
};

EntranceSpirit.getJsoner = function() {
  if (!EntranceSpirit.jsoner) {
    EntranceSpirit.jsoner = new Jsoner(EntranceSpirit.SCHEMA);
  }
  return EntranceSpirit.jsoner;
};

EntranceSpirit.prototype.getColor = function() {
  return Renderer.COLOR_WHITE;
};

EntranceSpirit.prototype.getModelId = function() {
  return ModelIds.ENTRANCE;
};

EntranceSpirit.prototype.toJSON = function() {
  return EntranceSpirit.getJsoner().toJSON(this);
};

EntranceSpirit.prototype.setFromJSON = function(json) {
  EntranceSpirit.getJsoner().setFromJSON(json, this);
};
