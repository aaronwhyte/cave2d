/**
 * @constructor
 * @extends {BaseTool}
 */
function Scanner(screen, clientSpirit) {
  BaseTool.call(this, screen);
  this.client  = clientSpirit;

  this.scanPeriod = 1.1;
  this.autoLockBreakTimeout = 10;
  this.coneWidth = Math.PI / 2;
  this.coneLen = 20;

  this.wideHitTime = -Infinity;
  this.wideHitPos = new Vec2d();
  this.wideHitVel = new Vec2d();
  this.wideHitSpiritId = 0;

  this.lockedHitTime = -Infinity;
  this.lockedHitPos = new Vec2d();
  this.lockedHitVel = new Vec2d();
  this.lockedHitSpiritId = 0;

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
  let now = this.now();
  this.lastScanTime = now;
  let pos = this.getBodyPos();
  if (!pos) {
    console.log('no body to scan from');
    return;
  }

  this.doWideScan(pos);

  if (this.lockedHitSpiritId >= 0) {
    this.doLockedScan(pos);
    if (this.lockedHitSpiritId >= 0 && now - this.lockedHitTime > this.autoLockBreakTimeout) {
      this.clearLockedSpiritId();
    }
  }
};

Scanner.prototype.doWideScan = function(pos) {
  let wielder = this.getWielderSpirit();
  let aimAngle = this.getBodyAngPos() + this.coneWidth * (Math.random() - 0.5);
  let rad = 0.1;
  let now = this.now();

  // TODO change this to first scan sans walls. That means doubling the team groups.
  let dist = this.scan(
      this.getFireHitGroupForTeam(wielder.team),
      pos,
      aimAngle,
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
  let wielder = this.getWielderSpirit();
  let aimVec = wielder.getAimVec();
  let lockedSpirit = this.screen.getSpiritById(this.lockedHitSpiritId);
  if (!lockedSpirit) {
    this.clearLockedSpiritId();
    return;
  }
  let lockedBody = this.screen.getBodyById(lockedSpirit.bodyId);
  if (!lockedBody) {
    this.clearLockedSpiritId();
    return;
  }

  let lockedPos = lockedSpirit.getBodyPos();
  let centerDist = pos.distance(lockedPos);
  if (centerDist - lockedBody.rad > this.coneLen) {
    // too far to scan
    return;
  }

  let angleToTarget = this.getAngleToBody(lockedBody);
  let angPos = this.getBodyAngPos();
  let angleDiff = angleToTarget - angPos;
  while (angleDiff > Math.PI) {
    angleDiff -= 2 * Math.PI;
  }
  while (angleDiff < -Math.PI) {
    angleDiff += 2 * Math.PI;
  }
  // TODO: add geometry code for deciding if a circle is within a cone
  if (angleDiff > this.coneWidth + Math.asin(lockedBody.rad / centerDist)) {
    // to the side of the cone
    return;
  }

  let rad = 0.2;
  let now = this.now();

  let dist = this.scan(this.getFireHitGroupForTeam(wielder.team), pos, angPos + angleDiff, this.coneLen, rad);
  if (dist >= 0) {
    let body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
    let spirit = this.screen.getSpiritForBody(body);
    if (spirit && spirit.id === lockedSpirit.id) {
      this.lockedHitTime = now;
      this.lockedHitPos.set(lockedPos);
      this.lockedHitVel.set(lockedSpirit.getBodyVel());
    }
  }
};

Scanner.prototype.setLockedSpiritId = function(spiritId) {
  this.lockedHitSpiritId = spiritId;
};

Scanner.prototype.clearLockedSpiritId = function() {
  this.lockedHitSpiritId = 0;
};
