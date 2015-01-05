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
GeneratorSpirit.ATTEMPTS = 4;

GeneratorSpirit.prototype.onTimeout = function(world, timeout) {
  var b = world.getBody(this.bodyId);

  var generatorPos = b.getPosAtTime(world.now, Vec2d.alloc());
  var playerPos = this.game.playerBody.getPosAtTime(world.now, Vec2d.alloc());

  // Generators are more active the closer the player gets to them, so there's no hard user-visible cutoff.
  if (generatorPos.distance(playerPos) < GnomeSpirit.MAX_SCAN_DIST * (0.3 + Math.random() * 0.7)) {
    var req = ScanRequest.alloc();
    var resp = ScanResponse.alloc();
    for (var attempt = 0; attempt < GeneratorSpirit.ATTEMPTS; attempt++) {
      // Do a scan that crosses the middle of the generator, to the proposed position of the new gnome.
      // It needs to cover the area of three gnomes, which is two diameters, or four radii,
      // because initial overlap doesn't get detected by rayscans, and we want to find a perfectly
      // clear spot to create the new gnome.
      req.hitGroup = Fracas2.Group.GENERATOR_SCAN;
      req.shape = Body.Shape.CIRCLE;
      req.rad = Fracas2.CHARACTER_RADIUS;
      req.vel.setXY(4 * Fracas2.CHARACTER_RADIUS, 0).rot(Math.PI * 2 * Math.random());
      req.pos.set(req.vel).scale(-0.5).add(generatorPos);
      if (!world.rayscan(req, resp)) {
        this.game.addGnomeToWorld(
            b.getPosAtTime(world.now, req.pos.add(req.vel)),
            req.vel.scaleToLength(GnomeSpirit.WANDER_ACCEL),
            this.game.world.now + 0.01);
        break;
      }
    }
    req.free();
    resp.free();
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
