/**
 * Dumping ground for splash effects, to keep the Screen class smaller.
 * @param {Splasher} splasher
 * @constructor
 */
function Splashes(splasher) {
  this.splasher = splasher;

  this.splash = new Splash();
}

// TODO delete these and don't try s27n on splashes.
Splashes.Type = {
  NOTE: 1,
  SCAN: 2,
  WALL_DAMAGE: 3,
  ENEMY_EXPLOSION: 4,
  ERROR: 5
};

Splashes.prototype.addPlayerSpawnSplash = function(now, pos, bodyRad, color) {
  let s = this.splash;
  s.reset();
  s.modelId = ModelIds.TUBE_32;
  let x = pos.x;
  let y = pos.y;

  s.startTime = now;
  s.duration = 16;
  let startRad = bodyRad * 3;
  let endRad = bodyRad * 9 ;

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

Splashes.prototype.addEnemyExplosion = function(now, pos, rad, color) {
  // cloud particles
  let s = this.splash;
  let x = pos.x;
  let y = pos.y;
  let self = this;

  let particles, explosionRad, dirOffset, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, rad) {
    s.reset(Splashes.Type.ENEMY_EXPLOSION, null);
    s.modelId = ModelIds.CIRCLE_32;
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -0.9);
    s.endPose.pos.setXYZ(x + dx, y + dy, 0.9);
    let startRad = rad;
    let endRad = rad / 4;
    s.startPose.scale.setXYZ(startRad, startRad, startRad);
    let startRot = Math.random() * Math.PI * 2;
    s.startPose.rotZ = startRot;
    s.endPose.rotZ = startRot + (Math.random() - 0.5) * 2 * Math.PI;
    s.endPose.scale.setXYZ(endRad, endRad, endRad);
    s.startColor.set(color);
    s.endColor.set(color).scale1(0.5);
    self.splasher.addCopy(s);
  }

  particles = Math.floor(8 * rad);
  explosionRad = rad * 8;
  dirOffset = 2 * Math.PI * Math.random();
  // outer
  for (let i = 0; i < particles; i++) {
    let erad = explosionRad * 0.8 * (0.8 + 0.4 * Math.random());
    duration = 1.4 * erad * (0.5 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles) + Math.random() * 0.3;
    dx = Math.sin(dir) * erad;
    dy = Math.cos(dir) * erad;
    addSplash(x, y, dx, dy, duration, rad * 0.8);
  }
  // middle cloud
  dirOffset = 2 * Math.PI * Math.random();
  particles = Math.floor(8 * rad);
  for (let i = 0; i < particles; i++) {
    duration = 10 * (1 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles);
    dx = Math.sin(dir) * explosionRad * 0.25;
    dy = Math.cos(dir) * explosionRad * 0.25;
    addSplash(x, y, dx, dy, duration, rad * (1.2 + Math.random() / 2));
  }
};

Splashes.prototype.addBulletHitExplosion = function(now, pos, rad, color) {
  let s = this.splash;
  let x = pos.x;
  let y = pos.y;
  let self = this;

  let particles, explosionRad, dirOffset, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, rad) {
    s.reset(Splashes.Type.ENEMY_EXPLOSION, null);
    s.modelId = ModelIds.CIRCLE_32;
    s.startTime = now;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -0.9);
    s.endPose.pos.setXYZ(x + dx, y + dy, 0.9);
    let startRad = rad;
    let endRad = rad / 4;
    s.startPose.scale.setXYZ(startRad, startRad, startRad);
    let startRot = Math.random() * Math.PI * 2;
    s.startPose.rotZ = startRot;
    s.endPose.rotZ = startRot + (Math.random() - 0.5) * 2 * Math.PI;
    s.endPose.scale.setXYZ(endRad, endRad, endRad);
    s.startColor.set(color);
    s.endColor.set(color);
    self.splasher.addCopy(s);
  }

  particles = 3;
  explosionRad = rad * 2;
  dirOffset = 2 * Math.PI * Math.random();
  for (let i = 0; i < particles; i++) {
    duration = 4 * (1 + Math.random());
    dir = dirOffset + 2 * Math.PI * (i/particles);
    dx = Math.sin(dir) * explosionRad;
    dy = Math.cos(dir) * explosionRad;
    addSplash(x, y, dx, dy, duration, rad * 0.5);
  }
};

Splashes.prototype.addPlayerExplosionSplash = function(now, pos, color) {
  let x = pos.x;
  let y = pos.y;
  let s = this.splash;

  // giant tube explosion
  s.reset();
  s.modelId = ModelIds.TUBE_32;

  s.startTime = now;
  s.duration = 10;
  let startRad = 2;
  let endRad = 20;

  s.startPose.pos.setXYZ(x, y, -0.5);
  s.endPose.pos.setXYZ(x, y, 0);
  s.startPose.scale.setXYZ(startRad, startRad, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, 1);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(-startRad, -startRad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.set(color);
  s.endColor.setXYZ(0, 0, 0);

  this.splasher.addCopy(s);

  // cloud particles
  let self = this;
  let particles, explosionRad, dirOffset, i, dir, dx, dy, duration;

  function addSplash(x, y, dx, dy, duration, sizeFactor, delay) {
    s.reset();
    s.modelId = ModelIds.CIRCLE_32;
    s.startTime = now + (delay || 0) + 1;
    s.duration = duration;

    s.startPose.pos.setXYZ(x, y, -Math.random());
    s.endPose.pos.setXYZ(x + dx, y + dy, 1);
    let startRad = sizeFactor;
    let endRad = sizeFactor * 0.1;
    s.startPose.scale.setXYZ(startRad, startRad, 1);
    s.endPose.scale.setXYZ(endRad, endRad, 1);

    s.startColor.set(color);
    s.endColor.set(color).scale1(0.5);
    self.splasher.addCopy(s);
  }

  // fast outer particles
  particles = 8;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    duration = 30;
    explosionRad = 15 + 10 * Math.random();
    dir = dirOffset + 2 * Math.PI * i / particles + Math.random() * 0.2;
    dx = Math.sin(dir) * explosionRad;
    dy = Math.cos(dir) * explosionRad;
    addSplash(x, y, dx, dy, duration, 1);
    addSplash(x, y, dx, dy, duration * 0.66, 1);
  }

  // inner smoke ring
  particles = 12;
  explosionRad = 4;
  dirOffset = 2 * Math.PI * Math.random();
  for (i = 0; i < particles; i++) {
    let r = Math.random() * 0.4 + (1 - 0.4 / 2);
    duration = 30 * r;
    dir = dirOffset + 2 * Math.PI * i / particles;
    dx = Math.sin(dir) * explosionRad;
    dy = Math.cos(dir) * explosionRad;
    addSplash(x, y, dx, dy, duration, explosionRad/2);
  }
};

Splashes.prototype.addExitSplash = function(x, y, startTime, duration) {
  // giant tube implosion
  let s = this.splash;
  s.reset(Splashes.Type.WALL_DAMAGE);
  s.modelId = ModelIds.TUBE_32;

  s.startTime = startTime;
  s.duration = Game5PlayScreen.EXIT_DURATION;
  let rad = 80;

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
  let s = this.splash;
  s.reset(Splashes.Type.SCAN);
  s.modelId = ModelIds.CYLINDER_32;

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

Splashes.prototype.addDotSplash = function(now, pos, rad, duration, r, g, b) {
  let s = this.splash;
  s.reset(Splashes.Type.NOTE);
  s.modelId = ModelIds.CIRCLE_32;
  s.startTime = now;
  let x = pos.x;
  let y = pos.y;
  s.duration = duration;
  s.startPose.pos.setXYZ(x, y, -0.99);
  s.endPose.pos.setXYZ(x, y, -0.99);
  s.startPose.scale.setXYZ(rad, rad, 1);
  s.endPose.scale.setXYZ(rad / 3, rad / 3, 1);
  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;

  s.startColor.setXYZ(r, g, b);
  s.endColor.setXYZ(r, g, b);

  this.splasher.addCopy(s);
};
