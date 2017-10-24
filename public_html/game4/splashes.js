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
  s.reset(Splashes.Type.SCAN, this.stamps.circleStamp);

  s.startTime = now;

  var x = pos.x;
  var y = pos.y;
  var hit = resultFraction >= 0;
  var d = hit ? resultFraction : 1;
  var dx = vel.x * d;
  var dy = vel.y * d;

  s.duration = 6;
  var startDistFrac = 1;
  var endRad = rad;
  var startRad = rad;
  var endDistFrac;
  if (pulling) {
    // fast pulling splashes
    endDistFrac = resultFraction * resultFraction;
    s.duration = 8;
  } else if (hit && Math.random() < 0.9) {
    // hit but not pulling - boring surface glitter
    endDistFrac = 1 - 0.1 * Math.random();
  } else {
    // miss, and some non-hit-pulls. glitter field particle drifting towards player
    startDistFrac = Math.random() * 0.5 + 0.5;
    endDistFrac = startDistFrac - 0.1;
    endRad *= 0.8;
  }
  s.startPose.pos.setXYZ(x + dx * startDistFrac, y + dy * startDistFrac, 1);
  s.endPose.pos.setXYZ(x + dx * endDistFrac, y + dy * endDistFrac, 0);
  s.startPose.scale.setXYZ(startRad, startRad, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.setXYZ(0, 1, 0);
  s.endColor.setXYZ(0, 1, 0);

  this.splasher.addCopy(s);
};


Splashes.KICK_START_DUR_BASE = 1;

Splashes.prototype.addKickHitSplash = function(now, scanPos, scanVel, resultFraction) {
  var scanMag = scanVel.magnitude();
  var v = Vec2d.alloc();
  var color = Vec4.alloc(0, 1, 0, 0);
  var r = PlayerSpirit.SEEKSCAN_RAD;
  var dur = (Splashes.KICK_START_DUR_BASE + Math.random()) * resultFraction;
  var p0t0 = Vec4.alloc().setXYFromVec2d(v.set(scanPos));
  var p1t0 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(Math.min(0.3, resultFraction)).add(scanPos));
  var p0t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(resultFraction).add(scanPos));
  var p1t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(resultFraction).add(scanPos));
  this.addMovingLine(now, dur, p0t0, p1t0, r, p0t1, p1t1, r, color);

  var lineCount = 1 + Math.floor(Math.random() * 2);
  p0t0.set(p1t1);
  scanVel.scaleToLength(1); // re-use
  for (var i = 0; i < lineCount; i++) {
    dur = 6 * (1 + Math.random());
    var burstRad = 16 * r * (Math.random() + 0.1);
    v.set(scanVel).rot(Math.PI * (1 - resultFraction) * (Math.random() - 0.5));
    p1t0.setXYFromVec2d(v).scale1(burstRad * 0.25).add(p0t0);
    p0t1.setXYFromVec2d(v).scale1(burstRad * 0.9).add(p0t0);
    p1t1.set(p0t1);
    this.addMovingLine(now, dur, p0t0, p1t0, r, p0t1, p1t1, r / 3, color);
  }
  dur = 0.5 * 6 * (1 + Math.random()) * (1 - resultFraction / 2);
  this.addMovingLine(now, dur * (1 + Math.random()), p0t0, p0t0, r * (1 + Math.random()), p0t0, p0t0, r / 3, color);

  v.free();
  color.free();
  p0t0.free();
  p1t0.free();
  p0t1.free();
  p1t1.free();
};

Splashes.prototype.addKickMissSplash = function(now, scanPos, scanVel) {
  var v = Vec2d.alloc();
  var color = Vec4.alloc(0, 1, 0, 0);
  var r = PlayerSpirit.SEEKSCAN_RAD;
  var baseDur = Splashes.KICK_START_DUR_BASE + Math.random();
  var p0t0 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.0).add(scanPos));
  var p1t0 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.3).add(scanPos));
  var p0t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.85).add(scanPos));
  var p1t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.95).add(scanPos));
  this.addMovingLine(now, baseDur, p0t0, p1t0, r, p0t1, p1t1, r, color);
  var p0t0 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.85).add(scanPos));
  var p1t0 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(0.95).add(scanPos));
  var p0t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(1).add(scanPos));
  var p1t1 = Vec4.alloc().setXYFromVec2d(v.set(scanVel).scale(1).add(scanPos));
  this.addMovingLine(now + baseDur, 8, p0t0, p1t0, r, p0t1, p1t1, r / 3, color);
  v.free();
  color.free();
  p0t0.free();
  p1t0.free();
  p0t1.free();
  p1t1.free();
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

/**
 * @param {number} now
 * @param {number} duration
 *
 * @param {Vec4} p0t0
 * @param {Vec4} p1t0
 * @param {number} rt0
 *
 * @param {Vec4} p0t1
 * @param {Vec4} p1t1
 * @param {number} rt1
 *
 * @param {Vec4} color
 */
Splashes.prototype.addMovingLine = function(now, duration, p0t0, p1t0, rt0, p0t1, p1t1, rt1, color) {
  var s = this.splash;
  s.reset(Splashes.Type.SCAN, this.stamps.cylinderStamp);

  s.startTime = now;
  s.duration = duration;

  s.startPose.pos.set(p0t0);
  s.endPose.pos.set(p0t1);
  s.startPose.scale.setXYZ(rt0, rt0, 1);
  s.endPose.scale.setXYZ(rt1, rt1, 1);

  s.startPose2.pos.set(p1t0);
  s.endPose2.pos.set(p1t1);
  s.startPose2.scale.setXYZ(rt0, rt0, 1);
  s.endPose2.scale.setXYZ(rt1, rt1, 1);

  s.startColor.set(color);
  s.endColor.set(color);

  this.splasher.addCopy(s);
};

Splashes.prototype.addLineBurst = function(now, duration, center, r, color) {
  var lineCount = 3 + Math.floor(Math.random() * 2);
  var angle = Math.random() * 2 * Math.PI;
  for (var i = 0; i < lineCount; i++) {
    angle += 2 * Math.PI / lineCount;
    this.addMovingLine
  }
};
