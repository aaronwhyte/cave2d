/**
 * Dumping ground for splash effects, to keep the Screen class smaller.
 * @param splasher
 * @param stamps
 * @constructor
 */
function Splashes(splasher, stamps) {
  this.splasher = splasher;
  this.stamps = stamps;

  this.splash = new Splash();
}

Splashes.Type = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ERROR: 4
};

Splashes.prototype.addPlayerSpawnSplash = function(now, pos, bodyRad, color) {
  var s = new Splash(1, this.stamps.tubeStamp);
  var x = pos.x;
  var y = pos.y;

  s.startTime = now;
  s.duration = 8;
  var startRad = bodyRad * 2;
  var endRad = bodyRad * 8;

  s.startPose.pos.setXYZ(x, y, 0.5);
  s.endPose.pos.setXYZ(x, y, 0.5);
  s.startPose.scale.setXYZ(0, 0, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, 1);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(startRad, startRad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.set(color);
  s.endColor.set(color).scale1(0.5);

  this.splasher.addCopy(s);
};

Splashes.prototype.addScanSplash = function(now, pos, vel, rad, dist) {
  var s = this.splash;
  s.reset(Splashes.Type.SCAN, this.stamps.cylinderStamp);

  s.startTime = now;
  s.duration = 3;

  var x = pos.x;
  var y = pos.y;
  var hit = dist >= 0;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.startPose.pos.setXYZ(x, y, 0);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad, rad, 1);

  s.startPose2.pos.setXYZ(x + dx, y + dy, 0);
  s.endPose2.pos.setXYZ(x + dx, y + dy, 1);
  s.startPose2.scale.setXYZ(rad, rad, 1);
  s.endPose2.scale.setXYZ(rad, rad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  if (dist < 0) {
    s.startColor.setXYZ(0.2, 0.5, 0.2);
    s.endColor.setXYZ(0.02, 0.05, 0.02);
  } else {
    s.startColor.setXYZ(0.8, 0.2, 0.2);
    s.endColor.setXYZ(0.08, 0.02, 0.02);
  }

  this.splasher.addCopy(s);
};

Splashes.prototype.addTractorSeekSplash = function(now, pos, vel, rad, dist, color) {
  var s = this.splash;
  s.reset(Splashes.Type, this.stamps.circleStamp);

  s.startTime = now;
  s.duration = 1 + Math.random();

  var x = pos.x;
  var y = pos.y;
  var hit = dist >= 0;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.startPose.pos.setXYZ(x + dx, y + dy, 1);
  var r = Math.random();
  var b = (r < 0.05) ? 0.4 : 1;
  if (r < 0.1) {
    s.duration = 10;
  } else {
    rad *= Math.random();
  }
  s.endPose.pos.setXYZ(x + dx * b, y + dy * b, 0);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad * (r*0.8 + 0.2), rad * (r*0.8 + 0.2), 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};

Splashes.prototype.addTractorRepelSplash = function(now, pos, angle, vel, rad, dist, color, timeFrac) {
  var s = this.splash;

  var hit = dist > 0;
  s.reset(Splashes.Type, this.stamps.circleStamp);

  s.startTime = now;

  var x = pos.x;
  var y = pos.y;
  var d = hit ? dist : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.duration = 4 + 6 * timeFrac;

  var r = dist >= 0 ? 1 : 1 + Math.random() * 0.1 + 0.1 * timeFrac;
  s.startPose.pos.setXYZ(x + dx, y + dy, 1);
  s.endPose.pos.setXYZ(x + dx*r, y + dy*r, 0);

  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad * 0.1, rad * 0.1, 1);

  s.startPose.rotZ = -angle;
  s.endPose.rotZ = -angle;

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};

Splashes.prototype.addPlayerExplosionSplash = function(now, pos, color) {
  var x = pos.x;
  var y = pos.y;

  // giant tube explosion
  var s = this.splash;
  s.reset(1, this.stamps.tubeStamp);

  s.startTime = now;
  s.duration = 10;
  var rad = 10;
  var endRad = 0;

  s.startPose.pos.setXYZ(x, y, -0.5);
  s.endPose.pos.setXYZ(x, y, 0);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, 1);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(-rad, -rad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.set(color);
  s.endColor.setXYZ(0, 0, 0);

  this.splasher.addCopy(s);

  // cloud particles

  var self = this;
  var particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, sizeFactor) {
    s.reset(1, self.stamps.circleStamp);
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -Math.random());
    s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
    var startRad = sizeFactor;
    s.startPose.scale.setXYZ(startRad, startRad, 1);
    s.endPose.scale.setXYZ(0, 0, 1);

    s.startColor.set(color);
    s.endColor.set(color).scale1(0.5);
    self.splasher.addCopy(s);
  }

  // fast outer particles
  particles = Math.ceil(15 * (1 + 0.5 * Math.random()));
  explosionRad = 20;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 15 * (1 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random();
    dx = Math.sin(dir) * explosionRad / duration;
    dy = Math.cos(dir) * explosionRad / duration;
    addSplash(x, y, dx, dy, duration, 1);
  }

  // inner smoke ring
  particles = Math.ceil(20 * (1 + 0.5 * Math.random()));
  explosionRad = 4;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 20 * (0.5 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i / particles) + Math.random() / 4;
    dx = Math.sin(dir) * explosionRad / duration;
    dy = Math.cos(dir) * explosionRad / duration;
    addSplash(x, y, dx, dy, duration, 2);
  }
};