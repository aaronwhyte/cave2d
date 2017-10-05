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
  this.color = new Vec4(0.2, 1, 0.2);
}
ExitSpirit.prototype = new BaseSpirit();
ExitSpirit.prototype.constructor = ExitSpirit;

ExitSpirit.TIMEOUT = 1;

ExitSpirit.EXIT_DISTANCE = 1.5;

ExitSpirit.SCHEMA = {
  0: "type",
  1: "id",
  2: "bodyId"
};

ExitSpirit.createModel = function() {
  return RigidModel.createRingMesh(5, 0.8)
      .setColorRGB(1, 1, 1);
};

ExitSpirit.factory = function(screen, stamp, pos) {
  var world = screen.world;

  var spirit = new ExitSpirit(screen);
  spirit.setModelStamp(stamp);
  var density = 1;

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
  var body = this.getBody();
  body.pathDurationMax = Infinity;
  // If the body is being moved (because it's in the editor), slow it to a stop.
  if (!body.vel.isZero()) {
    var friction = 0.5;
    var newVel = this.vec2d.set(body.vel).scale(1 - friction);
    if (newVel.magnitudeSquared() < 0.01) {
      newVel.reset();
    }
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
  var body = this.getBody();
  var bodyPos = this.getBodyPos();
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  // TODO: standardize Z
  this.modelMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x, bodyPos.y, -0.5))
      .multiply(this.mat44.toScaleOpXYZ(body.rad, body.rad, 1));

  renderer.setModelMatrix(this.modelMatrix);
  renderer.drawStamp();

  // arrows and stars
  if (this.screen.isPlaying()) {
    var toSign = Vec2d.alloc();
    var rad = body.rad;
    for (var slotName in this.screen.slots) {
      var slot = this.screen.slots[slotName];
      if (slot.isPlaying()) {
        var spirit = slot.spirit;
        if (spirit) {
          var playerPos = spirit.getBodyPos();
          var playerRad = spirit.getBody().rad;
          if (playerPos) {
            var surfaceDist = playerPos.distance(bodyPos) - rad - playerRad;
            if (surfaceDist > ExitSpirit.EXIT_DISTANCE) {
              // draw arrow
              toSign.set(playerPos).subtract(bodyPos).scaleToLength(rad + ExitSpirit.EXIT_DISTANCE/3);
              var arrowSize = ExitSpirit.EXIT_DISTANCE * 1.5;
              renderer.setStamp(this.stamps.arrow)
                  .setColorVector(this.vec4.set(spirit.color).scale1(0.7));//.scale1(1.2 - 0.4 * ((this.now() / 48) % 1)));
              // TODO: standardize Z
              this.modelMatrix.toIdentity()
                  .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x + toSign.x, bodyPos.y + toSign.y,
                      0.9 + Math.min(0.1, 0.001 * surfaceDist)))
                  .multiply(this.mat44.toScaleOpXYZ(arrowSize, arrowSize, 1))
                  .multiply(this.mat44.toRotateZOp(-toSign.angle() + Math.PI));

              renderer.setModelMatrix(this.modelMatrix);
              renderer.drawStamp();
            } else {
              // draw star
              toSign.set(playerPos).subtract(bodyPos)
                  .scaleToLength(rad + surfaceDist + 3.7 * playerRad);
              renderer.setStamp(this.stamps.star)
                  .setColorVector(this.vec4.set(spirit.color)
                      .scale1(0.7));// + 0.5 * Math.max(0, Math.sin(this.now() / 6))));
              var starSize = playerRad * 1.5;
              this.modelMatrix.toIdentity()
                  .multiply(this.mat44.toTranslateOpXYZ(bodyPos.x + toSign.x, bodyPos.y + toSign.y, 0.1))
                  .multiply(this.mat44.toScaleOpXYZ(starSize, starSize, 1))
                  .multiply(this.mat44.toRotateZOp(-toSign.angle()));

              renderer.setModelMatrix(this.modelMatrix);
              renderer.drawStamp();
            }

            // pull player into orbit?
            if (surfaceDist < ExitSpirit.EXIT_DISTANCE * 2) {
              var p0 = surfaceDist - ExitSpirit.EXIT_DISTANCE / 3;
              var v0 = 0;//this.vec2d.set(spirit.getBody().vel).rot(-toSign.angle()).y;
              var maxA = 0.1;
              var pushAccelMag = Spring.getLandingAccel(p0, v0, maxA, 3);
              spirit.addBodyVel(toSign.scaleToLength(1).scale(pushAccelMag));
            }
          }
        }
      }
    }
    toSign.free();
  }

};

ExitSpirit.prototype.toJSON = function() {
  return ExitSpirit.getJsoner().toJSON(this);
};

ExitSpirit.prototype.setFromJSON = function(json) {
  ExitSpirit.getJsoner().setFromJSON(json, this);
};
