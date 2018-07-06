/**
 * @constructor
 * @extends {BaseTool}
 */
function Scanner(screen, clientSpirit) {
  BaseTool.call(this, screen);
  this.client  = clientSpirit;

  this.scanPeriod = 1.5;
  this.autoLockBreakTimeout = 10;
  this.coneWidth = Math.PI / 3;
  this.coneLen = 20;

  this.wideHitTime = -Infinity;
  this.wideHitPos = new Vec2d();
  this.wideHitVel = new Vec2d();
  this.wideHitSpiritId = -1;

  this.lockedHitTime = -Infinity;
  this.lockedHitPos = new Vec2d();
  this.lockedHitVel = new Vec2d();
  this.lockedHitSpiritId = -1;

  this.lastScanTime = -Infinity;
}
Scanner.prototype = new BaseTool();
Scanner.prototype.constructor = Scanner;


Scanner.prototype.getNextFireTime = function() {
  // deterministic fuzzing
  let throttle = this.scanPeriod * (1 + 0.1 * Math.sin(9234.0127 * this.id + this.lastFireTime));
  return this.lastFireTime + throttle;
};

/**
 * This does the sweep
 * @override
 */
Scanner.prototype.fire = function() {
  this.lastScanTime = this.now();
  let pos = this.getBodyPos();
  if (!pos) {
    console.log('no body to scan from');
    return;
  }

  this.doWideScan(pos);
  if (this.lockedHitSpiritId >= 0) {
    this.doLockedScan(pos);
  }
};

Scanner.prototype.doWideScan = function(pos) {
  let wielder = this.getWielderSpirit();
  let aimVec = wielder.getAimVec().rot(this.coneWidth * (Math.random() - 0.5));
  let rad = 0.1;
  let now = this.now();

  // TODO change this to first scan sans walls. That means doubling the team groups.
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
        this.wideHitTime = now;
        this.wideHitSpiritId = spirit.id;
        this.wideHitPos.set(spirit.getBodyPos());
        this.wideHitVel.set(spirit.getBodyVel());
      } else {
        // TODO status = "target lost"?
      }
    }
  }
};

Scanner.prototype.doLockedScan = function(pos) {
  // TODO
};

Scanner.prototype.setLockedSpiritId = function(spiritId) {
  this.lockedId = spiritId;
};

Scanner.prototype.clearLockedSpiritId = function() {
  this.lockedId = -1;
};
