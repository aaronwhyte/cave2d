/**
 * Logic for deciding what to do in the game when two bodies touch.
 * @param screen  screen that's delegating its hit resolving biz
 * @param {HitResolver} bouncer  basic physics hitResolver
 * @constructor
 */
function Game6HitResolver(screen, bouncer) {
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
Game6HitResolver.prototype.resolveHit = function(time, collisionVec, b0, b1) {
  this.linearForce.reset();
  this.rubForce.reset();
  let s0 = this.screen.getSpiritForBody(b0);
  let s1 = this.screen.getSpiritForBody(b1);

  this.collide(time, collisionVec, b0, b1, s0, s1) ||
  this.collide(time, collisionVec, b1, b0, s1, s0) ||
  this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
};

/**
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {Body} b0
 * @param {Body} b1
 * @param {BaseSpirit} s0
 * @param {BaseSpirit} s1
 * @return {boolean} true iff the collision has been resolved.
 */
Game6HitResolver.prototype.collide = function(time, collisionVec, b0, b1, s0, s1) {
  // editor mode, or no spirits?
  if (!this.screen.isPlaying() || (!s0 && !s1)) {
    this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
    return true;
  }

  // wall?
  if (b0.hitGroup === HitGroups.WALL) {
    s1 && s1.onBeforeHitWall(collisionVec);
    this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
    s1 && s1.onAfterHitWall(collisionVec, this.linearForce.magnitude() + this.rubForce.magnitude());
    return true;
  }

  // player hits enemy or enemy fire?
  if (s0 && s0.type === Game6Key.PLAYER && s1 && s1.team === Team.ENEMY) {
    // impact
    this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
    if (s1.getStun()) {
      // stunned enemy dies
      s1.die();
    } else {
      // enemy bullet dies
      if (s1.type === Game6Key.BULLET) {
        s1.die();
      }
      // player dies
      s0.die();
    }
    return true;
  }

  // player bullet hits anything
  if (s0 && s0.type === Game6Key.BULLET && s0.team === Team.PLAYER) {
    // impact
    this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
    if (s1 && s1.team === Team.ENEMY) {
      // stuns enemy
      s1.stunForDuration(s0.stun);
    }
    // bullet always dies
    s0.die();
    return true;
  }

  return false;
};

Game6HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
