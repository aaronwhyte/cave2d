/**
 * @constructor
 * @extends {BaseTool}
 */
function Scanner(screen) {
  BaseTool.call(this, screen);
  this.targetSpiritId = -1;
  this.lastTargetTime = -Infinity;
  this.lastTargetPos = new Vec2d();
  this.lastTargetVel = new Vec2d();

  this.coneWidth = Math.PI / 2;
  this.coneLen = 20;
}
Scanner.prototype = new BaseTool();
Scanner.prototype.constructor = Scanner;


Scanner.prototype.getNextFireTime = function() {
  let throttle = 1.35 + 0.1 * Math.sin(9234.0127 * this.id + this.lastFireTime);
  return this.lastFireTime + throttle;
};

/**
 * @override
 */
Scanner.prototype.fire = function() {
  let pos = this.getBodyPos();
  if (!pos) return;

  let wielder = this.getWielderSpirit();
  let aimVec = wielder.getAimVec().rot(this.coneWidth * (Math.random() - 0.5));

  let rad = 0.1;

  // TODO change this to first scan sans walls. Pain because it means doubling the team groups.
  let dist = this.scan(
      this.getFireHitGroupForTeam(wielder.team),
      pos,
      aimVec.angle(),
      this.coneLen,
      rad);
  if (dist >= 0) {
    let body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
    let spirit = this.screen.getSpiritForBody(body);
    if (spirit) {
      if (wielder.attacksTeam(spirit.team)) {
        this.lastTargetTime = this.now();
        this.lastTargetPos.set(spirit.getBodyPos());
        this.lastTargetVel.set(spirit.getBodyVel());
        // TODO status = "target acquired"
      } else {
        // TODO status = "target lost"?
      }
    }
  }
};
