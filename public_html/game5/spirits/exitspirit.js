/**
 * @constructor
 * @extends {BaseSpirit}
 */
function ExitSpirit(screen) {
  BaseSpirit.call(this, screen);

  this.type = Game5BaseScreen.SpiritType.EXIT;

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

ExitSpirit.factory = function(screen, pos) {
  let world = screen.world;

  let spirit = new ExitSpirit(screen);

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

ExitSpirit.prototype.getModelId = function() {
  return ModelId.EXIT;
};

ExitSpirit.prototype.onTimeout = function(world, timeoutVal) {
  BaseSpirit.prototype.onTimeout.call(this, world, timeoutVal);

  if (this.screen.isPlaying()) {
    let body = this.getBody();
    let closeCount = 0;
    let playerCount = 0;
    let rad = body.rad;
    let bodyPos = this.getBodyPos();
    for (let slotName in this.screen.slots) {
      let slot = this.screen.slots[slotName];
      if (slot.isPlaying()) {
        playerCount++;
        let spirit = slot.spirit;
        if (spirit) {
          let playerPos = spirit.getBodyPos();
          let playerRad = spirit.getBody().rad;
          if (playerPos) {
            let dist = playerPos.distance(bodyPos);
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
};

ExitSpirit.prototype.onDraw = function(world, renderer) {
  this.drawBody();
  // arrows and stars and orbits
  if (this.screen.isPlaying()) {
    for (let slotName in this.screen.slots) {
      let slot = this.screen.slots[slotName];
      if (slot.isPlaying()) {
        let spirit = slot.spirit;
        if (spirit) {
          this.handlePlayerSpirit(world, renderer, spirit);
        }
      }
    }
  }
};

ExitSpirit.prototype.handlePlayerSpirit = function(world, renderer, playerSpirit) {
  let playerPos = playerSpirit.getBodyPos();
  if (!playerPos) return;

  let exitBody = this.getBody();
  let exitPos = this.getBodyPos();
  let exitRad = exitBody.rad;

  let playerRad = playerSpirit.getBody().rad;
  let surfaceDist = playerPos.distance(exitPos) - exitRad - playerRad;

  let toSign = this.toSign.set(playerPos).subtract(exitPos);

  renderer.setColorVector(this.vec4.set(playerSpirit.color).scale1(0.8 - Math.random() * 0.2));

  if (surfaceDist > ExitSpirit.EXIT_DISTANCE) {
    // Player is too far - draw arrow
    let arrowSize = playerRad * 2.2;
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
    let starSize = playerRad * 1.3;
    this.modelMatrix.toIdentity()
        .multiply(this.mat44.toTranslateOpXYZ(exitPos.x + toSign.x, exitPos.y + toSign.y, 0.1))
        .multiply(this.mat44.toScaleOpXYZ(starSize, starSize, 1))
        .multiply(this.mat44.toRotateZOp(-toSign.angle()));

    renderer.setModelMatrix(this.modelMatrix);
    renderer.drawStamp();
  }

  // pull player into orbit?
  if (surfaceDist < ExitSpirit.EXIT_DISTANCE * 2) {
    let p0 = surfaceDist - ExitSpirit.EXIT_DISTANCE / 2;
    let v0 = this.vec2d.set(playerSpirit.getBody().vel).rot(-toSign.angle()).y / 10;
    let maxA = 0.02;
    let pushAccelMag = Spring.getLandingAccel(p0, v0, maxA, ExitSpirit.TIMEOUT * 2);
    playerSpirit.addBodyVel(toSign.scaleToLength(1).scale(pushAccelMag));
  }
};
