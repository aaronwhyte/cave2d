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

Game6HitResolver.State = {
  WALL: 1,
  PLAYER: 2,
  PLAYER_FIRE: 3,
  MINE: 4,
  NEUTRAL_FIRE: 5,
  ENEMY: 6,
  ENEMY_STUNNED: 7,
  ENEMY_FIRE: 8,
  NEUTRAL_PROP: 9
};

Game6HitResolver.Response = {
  WALL: 1,
  NO_BOUNCE: 2,
  STUN: 4,
  DIE: 8,
  START_DESTRUCT: 16
};

/**
 * Index of all known state pairs and the collision responses, like
 * {
 *   stateA: {
 *     stateX: [responseA, responseX],
 *     stateY: [responseA, responseY],
 *     ...
 *   },
 *   stateB: {
 *     stateX: [responseB, responseX],
 *     stateY: [responseB, responseY],
 *   }
 *   meaning that when objects stateA and stateX collide,
 *   responseA and responseX are applied to their respective objects, etc.
 *   The mirror indexes are also always in there, so if
 *   RESOLUTIONS[stateA][stateX] = [responseA, responseX]
 *   then
 *   RESOLUTIONS[stateX][stateA] = [responseX, responseA]
 *   so the calling code never has to check twice to figure out what to do.
 */
Game6HitResolver.RESOLUTIONS = (function() {
  let s = Game6HitResolver.State;
  let r = Game6HitResolver.Response;
  let rv = {};

  function add(s0, s1, r0, r1) {
    if (!rv[s0]) rv[s0] = {};
    rv[s0][s1] = [r0, r1];
    if (s0 === s1) return;
    if (!rv[s1]) rv[s1] = {};
    rv[s1][s0] = [r1, r0];
  }

  function whenThis(s0) {
    return {
      s0: s0,
      hits: function(s1, r0, r1) {
        if (Array.isArray(s1)) {
          for (let i = 0; i < s1.length; i++) {
            add(s0, s1[i], r0, r1);
          }
        } else {
          add(s0, s1, r0, r1);
        }
        return this; // for function call chaining like whenThis().hits().hits().hits()...
      }
    };
  }

  whenThis(s.MINE)
      .hits([s.WALL, s.PLAYER, s.MINE, s.ENEMY, s.ENEMY_STUNNED],
          r.START_DESTRUCT, 0)
      .hits([s.PLAYER_FIRE, s.NEUTRAL_FIRE, s.ENEMY_FIRE],
          r.START_DESTRUCT, r.DIE);

  whenThis(s.WALL)
      .hits([s.PLAYER, s.PLAYER_FIRE, s.NEUTRAL_FIRE, s.ENEMY, s.ENEMY_STUNNED, s.ENEMY_FIRE],
          0, r.WALL);

  whenThis(s.PLAYER)
      .hits(s.PLAYER_FIRE, 0, r.DIE)
      .hits([s.NEUTRAL_FIRE, s.ENEMY_FIRE], r.DIE, r.DIE)
      .hits(s.ENEMY, r.DIE, 0)
      .hits(s.ENEMY_STUNNED, 0, r.DIE);

  whenThis(s.PLAYER_FIRE)
      .hits([s.ENEMY, s.ENEMY_STUNNED], r.DIE, r.STUN);

  whenThis(s.NEUTRAL_FIRE)
      .hits([s.ENEMY, s.ENEMY_STUNNED], r.DIE, r.STUN);

  return rv;
})();

Game6HitResolver.DEFAULT_RESOLUTION = [0, 0];

Game6HitResolver.prototype.getState = function(b, s) {
  let x = Game6HitResolver.State;
  if (b.hitGroup === HitGroups.WALL) return x.WALL;
  switch (s.type) {
    case Game6Key.PLAYER: return x.PLAYER;
    case Game6Key.MINE: return x.MINE;
    case Game6Key.BULLET:
      if (s.team === Team.PLAYER) return x.PLAYER_FIRE;
      if (s.team === Team.ENEMY) return x.ENEMY_FIRE;
      return x.NEUTRAL_FIRE;
    case Game6Key.ANT:
    case Game6Key.FLOATER:
    case Game6Key.WALKER:
      return s.getStun()
          ? x.ENEMY_STUNNED
          : x.ENEMY;
    case Game6Key.ENTRANCE:
    case Game6Key.EXIT:
      return x.NEUTRAL_PROP;
  }
  throw Error("unhandled body/spirit combo");
};

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
  let spirit0 = this.screen.getSpiritForBody(b0);
  let spirit1 = this.screen.getSpiritForBody(b1);
  if (this.screen.isPlaying() && (spirit0 || spirit1)) {
    let state0 = this.getState(b0, spirit0);
    let state1 = this.getState(b1, spirit1);
    let r = this.getResolution(state0, state1);
    this.applyPreBounceResponse(time, collisionVec, spirit0, spirit1, r[0]);
    this.applyPreBounceResponse(time, collisionVec, spirit1, spirit0, r[1]);
    if ((r[0] | r[1]) & Game6HitResolver.Response.NO_BOUNCE) {
      // don't bounce
    } else {
      this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
    }
    this.applyPostBounceResponse(time, collisionVec, spirit0, spirit1, r[0]);
    this.applyPostBounceResponse(time, collisionVec, spirit1, spirit0, r[1]);
  } else {
    // This is either edit-mode, or there are no spirits to execute fancy logic.
    this.bouncer.resolveHit(time, collisionVec, b0, b1, this.linearForce, this.rubForce);
  }
};

Game6HitResolver.prototype.getResolution = function(state0, state1) {
  let a = Game6HitResolver.RESOLUTIONS[state0];
  return (a && a[state1]) || Game6HitResolver.DEFAULT_RESOLUTION;
};

/**
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {BaseSpirit} s0
 * @param {BaseSpirit} s1
 * @param {Game6HitResolver.Response} r0
 */
Game6HitResolver.prototype.applyPreBounceResponse = function(time, collisionVec, s0, s1, r0) {
  let r = Game6HitResolver.Response;
  if (r0 & r.WALL) s0.onBeforeHitWall(collisionVec);
};

/**
 * @param {number} time
 * @param {Vec2d} collisionVec
 * @param {BaseSpirit} s0
 * @param {BaseSpirit} s1
 * @param {Game6HitResolver.Response} r0
 */
Game6HitResolver.prototype.applyPostBounceResponse = function(time, collisionVec, s0, s1, r0) {
  let r = Game6HitResolver.Response;
  let mag = this.linearForce.magnitude() + this.rubForce.magnitude();
  if (r0 & r.WALL) {
    s0.onAfterHitWall(collisionVec, mag);
  } else {
    s0 && s0.onAfterBounce(collisionVec, mag);
  }
  if (r0 & r.START_DESTRUCT) s0.startDetonationSequence();
  if (r0 & r.DIE) s0.die();
  if (r0 & r.STUN) s0.stunForDuration(30 * 4); // TODO some kinda fancy stun calculator
};

Game6HitResolver.prototype.getHitPos = function(time, collisionVec, b0, b1, out) {
  return this.bouncer.getHitPos(time, collisionVec, b0, b1, out);
};
