/**
 * Logic for deciding what to do in the game when two bodies touch.
 * @param screen  screen that's delegating its hit resolving biz
 * @param {HitResolver} bouncer  basic physics hitResolver
 * @constructor
 */
function Game5HitResolver(screen, bouncer) {
  this.screen = screen;
  this.bouncer = bouncer;
  this.vec = new Vec2d();

  this.linearForce = new Vec2d();
  this.rubForce = new Vec2d();
}

/**
 * @param {number} time
 * @param {Vec2d} collisionVec   Vector along which collision acceleration should be applied,
 * for default elastic collision resolution.
 * Its magnitude doesn't signify.
 * @param {Body} b0
 * @param {Body} b1
 */
Game5HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1) {
  // To prevent object interpenetration, do this.
  // To encourage it, don't do this. :-p
  let bounced = this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
  if (!bounced) {
    this.linearForce.reset();
    this.rubForce.reset();
  }
  let mag;

  // Plan effects on "the other":
  // damage, healing, activation, ice, slime, acceleration, teleport, etc.
  let s0 = this.screen.getSpiritForBody(b0);
  let s1 = this.screen.getSpiritForBody(b1);

  if (s0 && s1) {
    let damageTo0 = s1.damagesTeam(s0.team) ? s1.damage : 0;
    let damageTo1 = s0.damagesTeam(s1.team) ? s0.damage : 0;
    if (damageTo0) {
      s0.applyDamage(damageTo0);
      s0 = this.screen.getSpiritForBody(b0);
    }
    if (damageTo1) {
      s1.applyDamage(damageTo1);
      s1 = this.screen.getSpiritForBody(b1);
    }
  }
  if (s0 || s1) {
    mag = this.linearForce.magnitude() + this.rubForce.magnitude();
    if (s0) s0.onHitOther(collisionVec, mag, b1, s1);
    if (s1) s1.onHitOther(collisionVec, mag, b0, s0);
  }


  // Mutate each simultaneously:
  // apply damage, handle death
  // bounce unless vetoed
  // apply special effects

  let vec = Vec2d.alloc();
  mag = this.linearForce.magnitude() + this.rubForce.magnitude();
  let pos = this.getHitPos(time, collisionVec, b0, b1, vec);
  let otherBody, otherSpirit;

  let ebb = this.screen.bodyIfSpiritType(Game5Key.ENERGY_BULLET, b0, b1);
  if (ebb) {
    let ebbs = this.screen.getSpiritForBody(ebb);
    otherBody = this.screen.otherBody(ebb, b0, b1);
    otherSpirit = this.screen.getSpiritForBody(otherBody);
    if (otherSpirit && otherSpirit.getEnergyCapacity()) {
      ebbs.onHitEnergizable(otherSpirit, pos);
    }
  }
  vec.free();
};

Game5HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
