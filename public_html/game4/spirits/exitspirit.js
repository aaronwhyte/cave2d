/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ExitSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game4BaseScreen.SpiritType.EXIT;

  // temps
  this.vec2d = new Vec2d();
  this.vec4 = new Vec4();
  this.mat44 = new Matrix44();
  this.modelMatrix = new Matrix44();
  this.color = new Vec4(1, 1, 1);

  this.toSign = new Vec2d();
}
ExitSpirit.prototype = new BaseSpirit();
ExitSpirit.prototype.constructor = ExitSpirit;

ExitSpirit.TIMEOUT = 1;

ExitSpirit.EXIT_DISTANCE = 2;

ExitSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

ExitSpirit.createModel = function() {
  return RigidModel.createRingMesh(5, 0.8)
      .setColorRGB(0.2, 0.8, 0.2);
};

ExitSpirit.factory = function(screen, batchDrawer, pos) {
  var world = screen.world;

  var spirit = new ExitSpirit(screen);
  spirit.setBatchDrawer(batchDrawer);

  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, screen.now());
  b.rad = 4;
  b.hitGroup = screen.getHitGroups().NEUTRAL;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  spirit.bodyId = world.addBody(b);

  var spiritId = world.addSpirit(spirit);
  b.spiritId = spiritId;
  world.addTimeout(world.now, spiritId, -1);
  return spiritId;
};

ExitSpirit.prototype.onTimeout = function(world, timeoutVal) {
  if (this.changeListener) {
    this.changeListener.onBeforeSpiritChange(this);
  }
  this.maybeStop();
  var body = this.getBody();
  body.pathDurationMax = Infinity;
  // If the body is being moved (because it's in the editor), slow it to a stop.
  if (!body.vel.isZero()) {
    var friction = 0.5;
    var newVel = this.vec2d.set(body.vel).scale(1 - friction);
    body.setVelAtTime(newVel, world.now);
  }

  if (this.screen.isPlaying()) {
    var closeCount = 0;
    var playerCount = 0;
    var rad = body.rad;
    var bodyPos = this.getBodyPos();
    for (var slotName in this.screen.slots) {
      var slot = this.screen.slots[slotName];
      if (slot.isPlaying()) {
        playerCount++;
        var spirit = slot.spirit;
        if (spirit) {
          var playerPos = spirit.getBodyPos();
          var playerRad = spirit.getBody().rad;
          if (playerPos) {
            var dist = playerPos.distance(bodyPos);
            if (dist <= rad + playerRad + ExitSpirit.EXIT_DISTANCE) {
              closeCount++;
            }
          }
        }
      }
    }
    if (closeCount && closeCount === playerCount) {
      this.screen.startExit(bodyPos);
    }
    // if (Math.random() < 0.5) {
    //   this.screen.addPortalMoteSplash(bodyPos, body.rad, 0);
    // }
  }

  world.addTimeout(world.now + ExitSpirit.TIMEOUT, this.id, -1);

};

ExitSpirit.getJsoner = function() {
  if (!ExitSpirit.jsoner) {
    ExitSpirit.jsoner = new Jsoner(ExitSpirit.SCHEMA);
  }
  return ExitSpirit.jsoner;
};

ExitSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ExitSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  // arrows and stars and orbits
  if (this.screen.isPlaying()) {
    for (var slotName in this.screen.slots) {
      var slot = this.screen.slots[slotName];
      if (slot.isPlaying()) {
        var spirit = slot.spirit;
        if (spirit) {
          this.handlePlayerSpirit(world, renderer, spirit);
        }
      }
    }
  }
};

ExitSpirit.prototype.handlePlayerSpirit = function(world, renderer, playerSpirit) {
  var playerPos = playerSpirit.getBodyPos();
  if (!playerPos) return;

  var exitBody = this.getBody();
  var exitPos = this.getBodyPos();
  var exitRad = exitBody.rad;

  var playerRad = playerSpirit.getBody().rad;
  var surfaceDist = playerPos.distance(exitPos) - exitRad - playerRad;

  var toSign = this.toSign.set(playerPos).subtract(exitPos);

  renderer.setColorVector(this.vec4.set(playerSpirit.color).scale1(0.8 - Math.random() * 0.2));

  if (surfaceDist > ExitSpirit.EXIT_DISTANCE) {
    // Player is too far - draw arrow
    var arrowSize = playerRad * 2.2;
    toSign.scaleToLength(
        Math.min(exitRad + ExitSpirit.EXIT_DISTANCE/2, exitRad + surfaceDist - arrowSize * 1.5));
    renderer.setStamp(this.stamps.arrow);
    // TODO: standardize Z
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(exitPos.x + toSign.x, exitPos.y + toSign.y,
            0.9 + Math.min(0.1, 0.001 * surfaceDist)))
        .multiply(this.mat44.toScaleOpXYZ(arrowSize, arrowSize, 1))
        .multiply(this.mat44.toRotateZOp(-toSign.angle() + Math.PI));

    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();

  } else {
    // Player is ready to go! draw star
    toSign.set(playerPos).subtract(exitPos)
        .scaleToLength(exitRad + surfaceDist + 3.7 * playerRad);
    renderer.setStamp(this.stamps.star);
    var starSize = playerRad * 1.3;
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(exitPos.x + toSign.x, exitPos.y + toSign.y, 0.1))
        .multiply(this.mat44.toScaleOpXYZ(starSize, starSize, 1))
        .multiply(this.mat44.toRotateZOp(-toSign.angle()));

    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }

  // pull player into orbit?
  if (surfaceDist < ExitSpirit.EXIT_DISTANCE * 2) {
    var p0 = surfaceDist - ExitSpirit.EXIT_DISTANCE / 2;
    var v0 = this.vec2d.set(playerSpirit.getBody().vel).rot(-toSign.angle()).y / 10;
    var maxA = 0.1;
    var pushAccelMag = Spring.getLandingAccel(p0, v0, maxA, ExitSpirit.TIMEOUT * 2);
    playerSpirit.addBodyVel(toSign.scaleToLength(1).scale(pushAccelMag));
  }
};

ExitSpirit.prototype.toJSON = function() {
  return ExitSpirit.getJsoner().toJSON(this);
};

ExitSpirit.prototype.setFromJSON = function(json) {
  ExitSpirit.getJsoner().setFromJSON(json, this);
};
