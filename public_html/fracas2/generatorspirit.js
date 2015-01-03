/**
 * @constructor
 * @extends {Spirit}
 */
function GeneratorSpirit(game) {
  Spirit.call(this);
  this.game = game;
  this.bodyId = -1;
  this.id = -1;
  this.vec = new Vec2d();
}
GeneratorSpirit.prototype = new Spirit();
GeneratorSpirit.prototype.constructor = GeneratorSpirit;

GeneratorSpirit.TIMEOUT = 25;

GeneratorSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.getBody(this.bodyId);

  var generatorPos = b.getPosAtTime(world.now, Vec2d.alloc());
  var playerPos = this.game.playerBody.getPosAtTime(world.now, Vec2d.alloc());

  if (generatorPos.distance(playerPos) < GnomeSpirit.MAX_SCAN_DIST * (0.3 + Math.random() * 0.7)) {
    // generate
    // TODO rayscan and initial position
    this.game.addGnomeToWorld(b.getPosAtTime(world.now, this.vec));
  }

  world.addTimeout(world.now + GeneratorSpirit.TIMEOUT * (0.5 + Math.random()), this.id, null);
};

GeneratorSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  if (world.spirits[thatBody.spiritId] instanceof BulletSpirit) {
    return Fracas2.Reaction.DESTROY_GENERATOR;
  }
  return Fracas2.Reaction.BOUNCE;
};

GeneratorSpirit.prototype.setMoveStick = function(stick) {
  this.moveStick = stick;
};

GeneratorSpirit.prototype.setAimStick = function(stick) {
  this.aimStick = stick;
};
