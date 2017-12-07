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
  // To prevent object interpenetration, do this.
  // To encourage it, don't do this. :-p
  this.bouncer.resolveHit(time, collisionVec, b0, b1);

  // Plan effects on "the other":
  // damage, healing, activation, ice, slime, acceleration, teleport, etc.
  var s0 = this.screen.getSpiritForBody(b0);
  var s1 = this.screen.getSpiritForBody(b1);

  if (s0 && s1) {
    var damageTo0 = s1.damagesTeam(s0.team) ? s1.damage : 0;
    var damageTo1 = s0.damagesTeam(s1.team) ? s0.damage : 0;
    if (damageTo0) {
      s0.applyDamage(damageTo0);
      s0 = this.screen.getSpiritForBody(b0);
    }
    if (damageTo1) {
      s1.applyDamage(damageTo1);
      s1 = this.screen.getSpiritForBody(b1);
    }
  }

  // TODO: some other kind of onBounce handler
  if (s0 && s0.addTrailSegment) s0.addTrailSegment();
  if (s1 && s1.addTrailSegment) s1.addTrailSegment();


  // Mutate each simultaneously:
  // apply damage, handle death
  // bounce unless vetoed
  // apply special effects

  var vec = Vec2d.alloc();
  var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(collisionVec).magnitude();
  var pos = this.getHitPos(time, collisionVec, b0, b1, vec);
  var otherBody, otherSpirit;

  // var playerBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.PLAYER, b0, b1);
  // if (playerBody) {
  //   var playerSpirit = this.screen.getSpiritForBody(playerBody);
  //   var antBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ANT, b0, b1);
  //   if (antBody) {
  //     this.screen.killPlayerSpirit(playerSpirit);
  //   }
  //   if (!antBody) {
  //     // TODO: thump on wall hit, not on "else"
  //     this.screen.sounds.wallThump(pos, mag * 10);
  //   }
  // }
  //
  // var bulletBody = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.BULLET, b0, b1);
  // if (bulletBody) {
  //   var bulletSpirit = this.screen.getSpiritForBody(bulletBody);
  //   otherBody = this.screen.otherBody(bulletBody, b0, b1);
  //   otherSpirit = this.screen.getSpiritForBody(otherBody);
  //   if (!otherSpirit) {
  //     // wall?
  //     bulletSpirit.onHitWall(mag, pos);
  //   } else if (otherSpirit.type === Game4BaseScreen.SpiritType.ANT) {
  //     otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
  //     bulletSpirit.onHitEnemy(mag, pos);
  //   } else if (otherSpirit.type === Game4BaseScreen.SpiritType.BULLET) {
  //     bulletSpirit.onHitOther(mag, pos);
  //     otherSpirit.onHitOther(mag);
  //   } else {
  //     bulletSpirit.onHitOther(mag, pos);
  //   }
  // }

  var abb = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ACTIVATOR_BULLET, b0, b1);
  if (abb) {
    var abbs = this.screen.getSpiritForBody(abb);
    otherBody = this.screen.otherBody(abb, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (otherSpirit && otherSpirit.isActivatable()) {
      abbs.onHitActivatable(otherSpirit, pos);
    }
  }

  var ebb = this.screen.bodyIfSpiritType(Game4BaseScreen.SpiritType.ENERGY_BULLET, b0, b1);
  if (ebb) {
    var ebbs = this.screen.getSpiritForBody(ebb);
    otherBody = this.screen.otherBody(ebb, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (otherSpirit && otherSpirit.getEnergyCapacity()) {
      ebbs.onHitEnergizable(otherSpirit, pos);
    }
  }
  vec.free();

};

Game4HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
