/**
 * Helps spirits scan for the closest clear direction, or the least-obstructed direction, relative to the direction
 * the spirit is facing (plus any offset you'd like to use). Combined with motion controls, this helps critters
 * navigate through the world without bumping into things. It is not very good for hunting targets!
 * @constructor
 * @extends {BaseTool}
 */
function ClearPathScanner(screen) {
  BaseTool.call(this, screen);

  // these get re-set every time scanForBestPath is called
  this.bestRotation = 0;
  this.isObstructed = false;
  this.bestDistFraction = 0;
  this.obstructionPathId = 0;

  this.scanDist = 0;
}
ClearPathScanner.prototype = new BaseTool();
ClearPathScanner.prototype.constructor = ClearPathScanner;

ClearPathScanner.prototype.onDraw = function(){};

/** @override */
ClearPathScanner.prototype.getNextFireTime = function() {
  return -1;
};

/** @override */
ClearPathScanner.prototype.setButtonDown = function(b) {};

/** @override */
ClearPathScanner.prototype.fire = function() {};

/**
 * After this is called, these fields contain useful data:
 * <ul>
 * <li>bestRotation: the angle from the spirit's body's direction that is the clearest-looking
 * <li>isObstructed: true iff there was any obstruction detected in that bestRotation direction
 * <li>obstructionDistance: If isObstruted, then this will be the dist (0-1, a fraction of scanDist) of the obstruction.
 *
 * <li>obstructionPathId
 * </ul>

 * @param {number} hitGroup
 * @param {number} scanDist  the length of the rayscan center
 * @param {number} maxIterations  max number of scans to perform before reaching maxScanRotation on each side
 * @param {number} maxScanRotation  max angle to scan to on either side
 * @param {=number} angleOffset  the (optional) angular offset to use for the starting scan. Defaults to 0.
 */
ClearPathScanner.prototype.scanForBestPath = function(hitGroup, scanDist, maxIterations, maxScanRotation, angleOffset) {
  angleOffset = angleOffset || 0;
  let body = this.getBody();
  if (!body) {
    // bail out
    this.scanDist = scanDist;
    this.bestRotation = 0;
    this.isObstructed = false;
    this.bestDistFraction = 0;
    this.obstructionPathId = 0;
    return;
  }
  let pos = this.getBodyPos();
  let scanRad = body.rad;

  let bestFrac = 0; // lowest possible value
  let bestRot = 0;
  let pathId = 0;

  let distFrac = this.scan(hitGroup, pos, angleOffset, scanDist, scanRad);
  if (distFrac < 0) {
    bestFrac = 1;
    bestRot = angleOffset;
  } else {
    // hit something
    bestFrac = distFrac;
  }

  // Randomly pick a starting side for every pair of side-scans.
  let lastSign = Math.sign(Math.random() - 0.5);

  // A clear path is definitely the best path, so terminate (or don't start) if that's found.
  for (let i = 0; bestFrac !== 1 && i <= maxIterations; i++) {
    // Do a pair of scans, one to each side.
    for (let signMult = -1; signMult <= 1; signMult += 2) {
      let scanRot = angleOffset + signMult * lastSign * maxScanRotation * i / maxIterations;
      distFrac = this.scan(hitGroup, pos, scanRot, scanDist, scanRad);
      if (distFrac < 0) {
        // clear path - this will break the loop
        bestFrac = 1;
        bestRot = scanRot;
      } else {
        // hit something
        if (distFrac > bestFrac) {
          // This is the longest scan so far. Remember it.
          bestFrac = distFrac;
          bestRot = scanRot;
          pathId = this.scanResp.pathId;
        }
      }
    }
  }
  // output values
  this.scanDist = scanDist;
  this.bestRotation = bestRot;
  this.isObstructed = bestFrac !== 1;
  this.bestDistFraction = bestFrac;
  this.obstructionPathId = pathId;
};

ClearPathScanner.prototype.scan = function(hitGroup, pos, angleOffset, dist, rad) {
  let angle = this.getBodyAngPos() + angleOffset;
  return this.screen.scan(
      hitGroup,
      pos,
      this.scanVec.setXY(
          Math.sin(angle) * dist,
          Math.cos(angle) * dist),
      rad,
      this.scanResp);
};

