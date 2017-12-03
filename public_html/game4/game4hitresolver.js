/**
 * Logic for deciding what to do in the game when two bodies touch.
 * @param screen  screen that's delegating its hit resolving biz
 * @param {HitResolver} bouncer  basic physics hitResolver
 * @constructor
 */
function Game4HitResolver(screen, bouncer) {
  this.screen = screen;
  this.bouncer = bouncer;
}

Game4HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1) {
  this.bouncer.resolveHit(time, collisionVec, b0, b1);

  var vec = Vec2d.alloc();
  var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(collisionVec).magnitude();
  var pos = this.getHitPos(time, collisionVec, b0, b1, vec);
  var otherBody, otherSpirit;

  var playerBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.PLAYER, b0, b1);
  if (playerBody) {
    var playerSpirit = this.screen.getSpiritForBody(playerBody);
    var antBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ANT, b0, b1);
    if (antBody) {
      this.screen.killPlayerSpirit(playerSpirit);
    }
    if (!antBody) {
      // TODO: thump on wall hit, not on "else"
      this.screen.sounds.wallThump(pos, mag * 10);
    }
  }

  var bulletBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.BULLET, b0, b1);
  if (bulletBody) {
    var bulletSpirit = this.screen.getSpiritForBody(bulletBody);
    otherBody = this.screen.otherBody(bulletBody, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (!otherSpirit) {
      // wall?
      bulletSpirit.onHitWall(mag, pos);
    } else if (otherSpirit.type === Game4BaseScreen.SpiritType.ANT) {
      otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
      bulletSpirit.onHitEnemy(mag, pos);
    } else if (otherSpirit.type === Game4BaseScreen.SpiritType.BULLET) {
      bulletSpirit.onHitOther(mag, pos);
      otherSpirit.onHitOther(mag);
    } else {
      bulletSpirit.onHitOther(mag, pos);
    }
  }

  var abb = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ACTIVATOR_BULLET, b0, b1);
  if (abb) {
    var abbs = this.screen.getSpiritForBody(abb);
    otherBody = this.screen.otherBody(abb, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (otherSpirit && otherSpirit.isActivatable()) {
      abbs.onHitActivatable(otherSpirit, pos);
    } else {
      abbs.onHitOther(pos);
    }
  }

  var tbb = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.TRACTOR_BULLET, b0, b1);
  if (tbb) {
    var tbbs = this.screen.getSpiritForBody(tbb);
    tbbs.onHitOther(pos);
  }

  var ebb = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ENERGY_BULLET, b0, b1);
  if (ebb) {
    var ebbs = this.screen.getSpiritForBody(ebb);
    otherBody = this.screen.otherBody(ebb, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (otherSpirit && otherSpirit.getEnergyCapacity()) {
      ebbs.onHitEnergizable(otherSpirit, pos);
    } else {
      ebbs.onHitOther(pos);
    }
  }
  vec.free();

};

Game4HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
