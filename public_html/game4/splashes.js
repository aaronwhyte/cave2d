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
  s.duration = 16;
  var startRad = bodyRad * 3;
  var endRad = bodyRad * 9 ;

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
  s.endColor.set(color).scale1(0.1);

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

Splashes.prototype.addTractorSeekSplash = function(now, pulling, pos, vel, rad, resultFraction, color) {
  if (!pulling && Math.random() < 0.4) return;
  var s = this.splash;
  s.reset(Splashes.Type, this.stamps.circleStamp);

  s.startTime = now;

  var x = pos.x;
  var y = pos.y;
  var hit = resultFraction >= 0;
  var d = hit ? resultFraction : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.duration = 8;
  var startDistFrac = 1;
  if (pulling) {
    var endDistFrac = 0.9 - (1-resultFraction)*0.6;
    s.duration = 4;
  } else if (hit && Math.random() < 0.9) {
    var endDistFrac = 1;
  } else {
    startDistFrac = Math.random() * 0.5 + 0.5;
    var endDistFrac = startDistFrac - 0.1;
  }
  s.startPose.pos.setXYZ(x + dx * startDistFrac, y + dy * startDistFrac, 1);
  s.endPose.pos.setXYZ(x + dx * endDistFrac, y + dy * endDistFrac, 0);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad / 2, rad / 2, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.setXYZ(0, 1, 0);
  s.endColor.setXYZ(0, 1, 0);
  // s.startColor.set(color).scaleXYZ(0.5, 0.5, 0.5);
  // s.endColor.set(color).scaleXYZ(0.5, 0.5, 0.5);

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

Splashes.prototype.addExitSplash = function(x, y, startTime, duration) {
  // giant tube implosion
  var s = this.splash;
  s.reset(Splashes.Type.WALL_DAMAGE, this.stamps.tubeStamp);

  s.startTime = startTime;
  s.duration = Game4PlayScreen.EXIT_DURATION;
  var rad = 80;

  s.startPose.pos.setXYZ(x, y, -0.9999);
  s.endPose.pos.setXYZ(x, y, -0.9999);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad, rad, 1);

  s.startPose2.pos.setXYZ(x, y, -0.9999);
  s.endPose2.pos.setXYZ(x, y, -0.9999);
  s.startPose2.scale.setXYZ(rad/2, rad/2, 1);
  s.endPose2.scale.setXYZ(-rad/6, -rad/6, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(0, 0, 0);
  s.endColor.setXYZ(0, 0, 0);

  this.splasher.addCopy(s);
};


Splashes.prototype.addPortalMoteSplash = function(now, portalPos, startRad, endRad) {
  var maxSpeed = 0.03;
  if (Math.random() > maxSpeed * 20) return;
  var maxSize = Math.max(startRad, endRad) * 0.9 * 0.025;
  var v = Vec2d.alloc();
  var s = this.splash;
  s.reset(Splashes.Type, this.stamps.circleStamp);

  s.startTime = now;
  startRad *= 0.9;
  endRad *= 0.9;
  var frac = (0.3 + 0.7 * Math.random());
  var speed = maxSpeed * frac;
  var size = maxSize * frac;
  s.duration = Math.abs(startRad - endRad) / speed;

  var angle = Math.random() * Math.PI * 2;
  v.setXY(0, 1).rot(angle);
  s.startPose.pos.setXYZ(portalPos.x + v.x * startRad, portalPos.y + v.y * startRad, 0.9);
  s.startPose.scale.setXYZ(size*startRad, size*startRad, 1);
  s.startPose.rotZ = 0;

  var angle = Math.random() * Math.PI * 2;
  v.setXY(0, 1).rot(angle);
  s.endPose.pos.setXYZ(portalPos.x + v.x * endRad, portalPos.y + v.y * endRad, 0.9);
  s.endPose.scale.setXYZ(size*endRad, size*endRad, 1);
  s.endPose.rotZ = 0;

  s.startColor.setXYZ(1,1,1);
  s.endColor.setXYZ(1,1,1);

  this.splasher.addCopy(s);
  v.free();
};

