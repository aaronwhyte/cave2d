/**
 *
 * @param screen
 * @constructor
 * @extends {BaseTool}
 */
function TractorBeam(screen) {
  BaseTool.call(this, screen);
  this.scanRad = 0.3;
  this.scanFanAngle = Math.PI / 4;
  this.scanForce = 0.4;
  this.scanDist = 25;

  this.seekTargetBodyId = 0;
  
  this.scanPos = Vec2d.alloc();
  this.scanVel = Vec2d.alloc();
  this.forceVec = Vec2d.alloc();
  this.forcePos = Vec2d.alloc();
  this.smoothDist = 2;
  this.candidateRF = 2;
  this.unsuitableRF = 2;

  this.warble = null;
}
TractorBeam.prototype = new BaseTool();
TractorBeam.prototype.constructor = TractorBeam;

TractorBeam.WARM_UP_TIME = 0;
TractorBeam.COOL_DOWN_TIME = 0.7;

TractorBeam.prototype.onDraw = function() {
  let shouldWarble = this.buttonDown;

  if (!shouldWarble && this.warble) {
    this.warble.stop();
    this.warble = null;
  }
  if (shouldWarble && !this.warble) {
    this.warble = new Sounds.Warble(this.screen.sounds, 'sine', 'square');
    this.warble.setGain(0.1);
    this.warble.start();
  }

  let d = Math.min(this.candidateRF, this.unsuitableRF, 1);
  let c = this.candidateRF < 2;

  if (this.warble) {
    this.warble.setGain(0.2 * (1 - 0.2 * d));
    this.warble.setWorldPos(this.getBodyPos());
    this.warble.setWubFreq((c ? 30 : 20) - 10 * d);
    this.warble.setPitchFreq(140 + (c ? 440 - 440 * Math.sqrt(d) : 0));
  }
};

TractorBeam.prototype.setButtonDown = function(b) {
  BaseTool.prototype.setButtonDown.call(this, b);
  if (!b && this.warble) {
    this.warble.stop();
    this.warble = null;
  }
};

TractorBeam.prototype.getNextFireTime = function() {
  let throttle = TractorBeam.COOL_DOWN_TIME;// + 0.05 * Math.sin(432.978 * this.id * this.lastFireTime);
  return Math.max(this.lastFireTime + throttle, this.lastButtonDownTime + TractorBeam.WARM_UP_TIME);
};


TractorBeam.prototype.fire = function() {
  let wielder = this.getWielderSpirit();
  if (!wielder) return;

  let now = this.now();

  // RF means rayscan result fraction, from 0-1, where 2 is basically infinity
  this.candidateRF = 2;
  this.unsuitableRF = 2;

  // maybe direct a scan towards the last body we attracted
  let seekBody = this.getSeekTargetBody();
  if (seekBody) {
    // Throw a scan at the target body, with some randomness
    let anglePaddingMult = 1.3;
    let angleDiffToSeekBody = this.getAngleDiff(this.getAngleToBody(seekBody));
    if (Math.abs(angleDiffToSeekBody) <= anglePaddingMult * this.scanFanAngle / 2) {
      let radUnit = angleDiffToSeekBody / this.scanFanAngle / 2;
      // set this.scanVel
      seekBody.getPosAtTime(now, this.scanVel)
          .subtract(this.getBodyPos())
          .scaleToLength(this.scanDist * (1 - radUnit * radUnit))
          .rot(3 * seekBody.rad * (Math.random() - 0.5) / this.scanDist);
      this.scanPos.set(this.getBodyPos());
      this.scan();
    } else {
      this.seekTargetBodyId = null;
    }
  } else {
    // random scan
    let aimAngle = wielder.getAimVec().angle();
    let radUnit = Math.random() - 0.5;
    this.scanPos.setXY(radUnit * this.getBody().rad, 0).rot(aimAngle).add(this.getBodyPos());
    this.scanVel.setXY(0, this.scanDist * (1 - radUnit * radUnit)).rot(radUnit * this.scanFanAngle + aimAngle);
    this.scan();
  }
};

TractorBeam.prototype.scan = function() {
  let now = this.now();
  let rf = this.scanWithVel(HitGroups.NEUTRAL, this.scanPos, this.scanVel, this.scanRad);
  let pulling = false;
  if (rf === -1) {
    // miss
  } else {
    let foundBody = this.getScanHitBody();
    if (foundBody) {
      // hit
      if (foundBody.mass === Infinity) {
        // unsuitable
        if (rf < this.unsuitableRF) {
          this.unsuitableRF = rf;
        }
      } else {
        // candidate
        if (rf < this.candidateRF) {
          this.candidateRF = rf;
          this.seekTargetBodyId = foundBody.id;
        }
        // pull it closer
        this.forcePos.set(this.scanVel).scale(rf).add(this.scanPos).scale(0.1)
            .add(foundBody.getPosAtTime(now, this.vec2d)).scale(1 / (1 + 0.1));
        this.forceVec.set(this.scanVel).scaleToLength(-(1 - rf * 0.9) * this.scanForce);
        foundBody.applyForceAtWorldPosAndTime(this.forceVec, this.forcePos, now);

        // Apply opposite force to wielder
        // this.getBody().applyForceAtWorldPosAndTime(this.forceVec.scale(-1), this.getBodyPos(), now);

        this.screen.splashes.addTractorSeekSplash(now, true, this.scanPos, this.scanVel, this.scanRad, rf);
        pulling = true;
      }
    }
  }
  if (!pulling) {
    this.screen.splashes.addTractorSeekSplash(now, false, this.scanPos, this.scanVel, this.scanRad, rf);
  }
};

TractorBeam.prototype.getSeekTargetBody = function() {
  let b = null;
  if (this.seekTargetBodyId) {
    b = this.screen.getBodyById(this.seekTargetBodyId);
  } else {
    this.seekTargetBodyId = 0;
  }
  return b;
};

