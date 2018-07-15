/**
 * @constructor
 * @extends {BaseTool}
 */
function Scanner(screen, clientSpirit) {
  BaseTool.call(this, screen);
  this.client  = clientSpirit;

  this.scanPeriod = 1;
  this.scanRad = 0.5;
  this.scanGap = 0.25;
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
 * @override
 */
Scanner.prototype.setButtonDown = function(b) {
  BaseTool.prototype.setButtonDown.call(this, b);
  if (!b) this.clearLockedSpiritId();
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
};

Scanner.prototype.doWideScan = function(pos) {
  let wielder = this.getWielderSpirit();
  let now = this.now();
  let rad = this.scanRad;
  let sweepSize = this.coneLen * this.coneWidth;
  let stepsPerSweep = Math.floor(sweepSize / (2 * rad + this.scanGap));
  let stepNum = ((this.wielderId * 17 + now) / this.scanPeriod) % (2 * stepsPerSweep);
  if (stepNum >= stepsPerSweep) {
    stepNum = stepsPerSweep * 2 - stepNum;
  }
  let aimAngle = this.getBodyAngPos() - 0.5 * this.coneWidth + stepNum * this.coneWidth / stepsPerSweep;

  // First scan and ignore walls, because there's no reason to do collision checks with walls
  // if there's no target behind those walls, and wall checks are expensive.
  let isAnyoneThereDist = this.scan(
      this.getWideScanHitGroupForTeam(wielder.team),
      pos,
      aimAngle,
      this.coneLen,
      rad);
  if (isAnyoneThereDist >= 0) {
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
        }
      }
    }
  }

  // auto-clear the lock
  if (this.lockedHitSpiritId && now - this.lockedHitTime > this.autoLockBreakTimeout) {
    this.clearLockedSpiritId();
  }
};

/**
 * Wielder calls this to see if the locked object is still visible.
 */
Scanner.prototype.doLockedScan = function() {
  if (!this.lockedHitSpiritId) return;

  let wielder = this.getWielderSpirit();
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

  let pos = this.getBodyPos();
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
  if (Math.abs(angleDiff) > this.coneWidth/2) {// + Math.asin(lockedBody.rad / centerDist)) {
    // to the side of the cone
    return;
  }

  let rad = 0.5;
  let now = this.now();

  // This is purely an obstruction check, so pay full price for wall detection.
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

  if (this.lockedHitSpiritId && now - this.lockedHitTime > this.autoLockBreakTimeout) {
    this.clearLockedSpiritId();
  }
};

Scanner.prototype.setLockedSpiritId = function(spiritId) {
  this.lockedHitSpiritId = spiritId;
};

Scanner.prototype.clearLockedSpiritId = function() {
  this.lockedHitSpiritId = 0;
};
