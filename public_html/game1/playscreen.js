/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sound) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sound);
  this.trackball = new MultiTrackball()
      .addTrackball(new MouseTrackball())
      .addTrackball(new TouchTrackball());
  this.trackball.setFriction(0.02);
  this.movement = new Vec2d();

  // for sound throttling
  this.hitsThisFrame = 0;

  this.visibility = 0;
  this.permStamps = null;
  this.world = null;
  this.tempPlayerPos = new Vec2d();
  this.tempSoundPos = new Vec4();
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.ENEMY_MISSILE_RAD = 5;

PlayScreen.Group = {
  EMPTY: 0,
  WALL: 1,
  PLAYER: 2,
  PLAYER_MISSILE: 3,
  ENEMY: 4,
  ENEMY_MISSILE: 5
};

PlayScreen.prototype.onPointerDown = function(pageX, pageY) {
  if (Vec2d.distance(pageX, pageY, this.canvas.width/2, 0) < Math.min(this.canvas.height, this.canvas.width)/4) {
    this.pauseGame();
  } else {
    this.controller.requestPointerLock();
  }
};

PlayScreen.prototype.onSpaceDown = function() {
  this.pauseGame();
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    this.trackball.startListening();
  } else {
    this.trackball.stopListening();
  }
  this.listening = listen;
};

PlayScreen.prototype.pauseGame = function() {
  var freq0 = 3000;
  var freq1 = 30;
  var delay = 0;
  var attack = 0.05;
  var sustain = 0.15;
  var decay = 0.01;
  this.sfx.sound(0, 0, 0, 0.5, attack, sustain, decay, freq0, freq1, 'square', delay);
  this.controller.exitPointerLock();
  this.controller.gotoScreen(Game1.SCREEN_PAUSE);
};

PlayScreen.prototype.lazyInit = function() {
  if (!this.permStamps) {
    this.initPermStamps();
  }
  if (!this.world) {
    this.initWorld();
  }
};

PlayScreen.prototype.initPermStamps = function() {
  this.permStamps = [];

  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.permStamps.push(this.cubeStamp);

  var sphereModel = RigidModel.createOctahedron()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .createQuadrupleTriangleModel()
      .sphereize(Vec4.ZERO, 1);
  this.sphereStamp = sphereModel.createModelStamp(this.renderer.gl);
  this.permStamps.push(this.sphereStamp);
};

PlayScreen.prototype.initWorld = function() {
  this.lastPathRefreshTime = -Infinity;
  var groupCount = Object.keys(PlayScreen.Group).length;
  this.world = new World(World.DEFAULT_CELL_SIZE, Object.keys(PlayScreen.Group).length, [
    [PlayScreen.Group.EMPTY, PlayScreen.Group.EMPTY],
    [PlayScreen.Group.WALL, PlayScreen.Group.EMPTY],
    [PlayScreen.Group.PLAYER, PlayScreen.Group.WALL],
    [PlayScreen.Group.PLAYER_MISSILE, PlayScreen.Group.WALL],
    [PlayScreen.Group.ENEMY, PlayScreen.Group.WALL],
    [PlayScreen.Group.ENEMY, PlayScreen.Group.PLAYER],
    [PlayScreen.Group.ENEMY, PlayScreen.Group.PLAYER_MISSILE],
    [PlayScreen.Group.ENEMY, PlayScreen.Group.ENEMY],
    [PlayScreen.Group.ENEMY_MISSILE, PlayScreen.Group.WALL],
    [PlayScreen.Group.ENEMY_MISSILE, PlayScreen.Group.PLAYER]
  ]);
  this.resolver = new HitResolver();
  this.resolver.defaultElasticity = 0.8;
  this.initCreatures();
  this.initWalls();
  for (var bodyId in this.world.bodies) {
    var b = this.world.bodies[bodyId];
    this.worldBoundingRect.coverRect(b.getBoundingRectAtTime(this.world.now));
  }
};

PlayScreen.prototype.initCreatures = function() {
  this.playerSpiritId = this.initPlayer(0, 30, 8, 1,
      2, 0.2, 1.5,
      this.sphereStamp);

  var maxEnemies = 5;
  for (var i = 0; i < maxEnemies; i++) {
    var r = 6 * i/maxEnemies + 2;
    this.initEnemy(
            Math.sin(Math.PI * 2 * i/maxEnemies) * (120-r),
            Math.cos(Math.PI * 2 * i/maxEnemies) * (120-r));
  }
};

PlayScreen.prototype.initEnemy = function(x, y) {
  var rad = 8;
  var density = 1;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosXYAtTime(x, y, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.ENEMY;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = EnemySpirit.MOVE_TIMEOUT * 1.01;
  var spirit = new EnemySpirit(this);
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.sphereStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(0.6, 1, 0.6);
  this.world.spirits[spiritId].onTimeout(this.world);
  return spiritId;
};

PlayScreen.prototype.initEnemyMissile = function(pos, vel) {
  var density = 2;
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosAtTime(pos, this.world.now);
  b.setVelAtTime(vel, this.world.now);
  b.rad = PlayScreen.ENEMY_MISSILE_RAD;
  b.hitGroup = PlayScreen.Group.ENEMY_MISSILE;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  b.pathDurationMax = Infinity;
  var spirit = new BallSpirit(); // TODO EnemyBulletSpirit?
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(this.sphereStamp);
  var spiritId = this.world.addSpirit(spirit);
  b.spiritId = spiritId;
  this.world.spirits[spiritId].setColorRGB(2, 0.2, 0.2);
  return spiritId;
};

PlayScreen.prototype.initPlayer = function(x, y, rad, density, red, green, blue, stamp) {
  var b = Body.alloc();
  b.shape = Body.Shape.CIRCLE;
  b.setPosXYAtTime(x, y, this.world.now);
  b.rad = rad;
  b.hitGroup = PlayScreen.Group.PLAYER;
  b.mass = (Math.PI * 4/3) * b.rad * b.rad * b.rad * density;
  // TODO: add friction, fix path durations
  b.pathDurationMax = PATH_DURATION * 1.1;
  var spirit = new BallSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setModelStamp(stamp);
  var spiritId = this.world.addSpirit(spirit);
  this.world.spirits[spiritId].setColorRGB(red, green, blue);
  return spiritId;
};

PlayScreen.prototype.initWalls = function() {
  var grid = new QuadTreeGrid(50.375412352, 5);
  function paintHall(p1, opt_p2) {
    var p2 = opt_p2 || p1;
    var segment = new Segment(p1, p2);
    var painter = new MazePainter(segment, 100, 20);
    grid.paint(painter);
  }
  var rad = 100;
  paintHall(new Vec2d(-rad, -rad), new Vec2d(0, 0.7 * rad));
  paintHall(new Vec2d(0, 0.7 * rad), new Vec2d(rad, -rad));
  paintHall(new Vec2d(-rad, -rad), new Vec2d(rad, -rad));
  paintHall(new Vec2d(rad * 2.14, rad * 0.8));
  paintHall(new Vec2d(-rad * 2.14, rad * 0.8));

  this.levelModel = new RigidModel();
  var a, h, i;
  a = grid.getSquaresOfColor(MazePainter.SOLID);
  for (i = 0; i < a.length; i++) {
    h = a[i];
    //[color, centerX, centerY, radius]
    this.initWall(h[0], h[1], h[2], h[3], h[3]);
  }
  a = grid.getSquaresOfColor(MazePainter.FAKE);
  for (i = 0; i < a.length; i++) {
    h = a[i];
    //[color, centerX, centerY, radius]
    this.initWall(h[0], h[1], h[2], h[3], h[3]);
  }
  this.levelStamp = this.levelModel.createModelStamp(this.renderer.gl);
  this.permStamps.push(this.levelStamp);
  this.levelModelMatrix = new Matrix44();
  this.levelColorVector = new Vec4(1, 1, 1);
};

PlayScreen.prototype.initWall = function(type, x, y, rx, ry) {
  if (type == MazePainter.SOLID) {
    // Create a physics body
    var b = Body.alloc();
    b.shape = Body.Shape.RECT;
    b.setPosXYAtTime(x, y, this.world.now);
    b.rectRad.setXY(rx, ry);
    b.hitGroup = PlayScreen.Group.WALL;
    b.mass = Infinity;
    b.pathDurationMax = Infinity;
    this.world.addBody(b);
  }
  // draw a square for both SOLID and FAKE walls
  var t = new Matrix44().toTranslateOpXYZ(x, y, 0).multiply(new Matrix44().toScaleOpXYZ(rx, ry, 1));
  var wallModel = RigidModel.createSquare().transformPositions(t);
  wallModel.setColorRGB(0.3, 0.7, 0.9);
  this.levelModel.addRigidModel(wallModel);
};

PlayScreen.prototype.handleInput = function() {
  if (!this.world) return;
  var spirit = this.world.spirits[this.playerSpiritId];
  var body = this.world.bodies[spirit.bodyId];
  var newVel = Vec2d.alloc();
  if (this.trackball.isTouched()) {
    this.trackball.getVal(this.movement);
    var sensitivity = 4;
    this.movement.scale(sensitivity);
    newVel.setXY(this.movement.x, -this.movement.y);

    var accel = Vec2d.alloc().set(newVel).subtract(body.vel);
    var maxAccel = 10;
    // If it's over 1, then use a square root to lower it.
    // (If it's less than 1, then sqrt will make it bigger, so don't bother.)
    var mag = accel.magnitude();
    if (mag > 1) {
      accel.scaleToLength(Math.sqrt(mag));
    }
    accel.clipToMaxLength(maxAccel);
    newVel.set(body.vel).add(accel);
    body.setVelAtTime(newVel, this.world.now);
    accel.free();
  }
  newVel.free();
  this.trackball.reset();
};

PlayScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var strikeVec = Vec2d.alloc().set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec);
    var mag = strikeVec.magnitude();
    this.hitsThisFrame++;
    if (this.hitsThisFrame < 4) {
      this.bonk(b0, mag);
      this.bonk(b1, mag);
    }
    strikeVec.free();

    var missileBody = this.bodyIfInGroup(PlayScreen.Group.ENEMY_MISSILE, b0, b1);
    if (missileBody) {
      this.world.removeSpiritId(missileBody.spiritId);
      this.world.removeBodyId(missileBody.id);
      var playerBody = this.bodyIfInGroup(PlayScreen.Group.PLAYER, b0, b1);
      if (playerBody) {
        this.soundKaboom(this.getPlayerPos());
        this.loseLife();
      } else {
        this.soundBing(missileBody.getPosAtTime(this.world.now, this.vec2d));
      }
    }
  }
};

PlayScreen.prototype.loseLife = function() {
  this.quitting = true;
};

PlayScreen.prototype.bodyIfInGroup = function(group, b0, b1) {
  if (b0 && b0.hitGroup == group) return b0;
  if (b1 && b1.hitGroup == group) return b1;
  return null;
};

PlayScreen.prototype.bonk = function(body, mag) {
  var mass, vol, dur, freq, freq2;
  var bodyPos = Vec2d.alloc();
  body.getPosAtTime(this.world.now, bodyPos);
  this.vec4.setXYZ(bodyPos.x, bodyPos.y, 0);
  this.vec4.transform(this.viewMatrix);
  if (body.shape == Body.Shape.RECT) {
    this.soundWallThump(bodyPos, mag);
  } else {
    this.soundBodyCheck(bodyPos, mag, body.mass);
  }
  bodyPos.free();
};

PlayScreen.prototype.updateViewMatrix = function() {
  var br = this.worldBoundingRect;
  this.viewMatrix.toIdentity();
  var ratio = Math.min(this.canvas.height / br.rad.y, this.canvas.width / br.rad.x);
  this.viewMatrix
      .multiply(this.mat4.toScaleOpXYZ(
              ratio / this.canvas.width,
              ratio / this.canvas.height,
          0.2));

  // scale
  var v = this.visibility;
  this.viewMatrix.multiply(this.mat4.toScaleOpXYZ(3 - v*2, v * v, 1));

  // center
  this.viewMatrix.multiply(this.mat4.toTranslateOpXYZ(
      -br.pos.x,
      -br.pos.y,
      0));

  this.renderer.setViewMatrix(this.viewMatrix);
};

PlayScreen.prototype.drawScene = function() {
  this.hitsThisFrame = 0;
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.renderer
      .setStamp(this.levelStamp)
      .setColorVector(this.levelColorVector)
      .setModelMatrix(this.levelModelMatrix)
      .drawStamp();

  if (this.quitting) {
    this.controller.quit();
    this.quitting = false;
  } else {
    // Animate whenever this thing draws.
    this.controller.requestAnimation();
  }
};

PlayScreen.prototype.unloadLevel = function() {
  if (this.world) {
    for (var spiritId in this.world.spirits) {
      var s = this.world.spirits[spiritId];
      var b = this.world.bodies[s.bodyId];
      this.world.removeBodyId(b.id);
      this.world.removeSpiritId(spiritId);
    }
    this.world = null;
  }
  // TODO this should be level Stamps, not permStamps. permStamps are permanent.
  while (this.permStamps.length) {
    this.permStamps.pop().dispose(this.renderer.gl);
  }
  this.permStamps = null;
};

PlayScreen.prototype.getPlayerPos = function() {
  var spirit = this.world.spirits[this.playerSpiritId];
  var body = this.world.bodies[spirit.bodyId];
  body.getPosAtTime(this.world.now, this.tempPlayerPos);
  return this.tempPlayerPos;
};

PlayScreen.prototype.isPlayerPathId = function(pathId) {
  var spirit = this.world.spirits[this.playerSpiritId];
  return this.world.paths[pathId] == this.world.bodies[spirit.bodyId];
};

/**
 * @param {Vec2d} fromPos
 * @param {Vec2d} outVec populated if player is found
 * @returns {Vec2d} outVec if the player was found, or null otherwise.
 */
PlayScreen.prototype.scanForPlayer = function(fromPos, outVec) {
  var req = ScanRequest.alloc();
  req.hitGroup = PlayScreen.Group.ENEMY_MISSILE;
  // write the body's position into the req's position slot.
  req.pos.set(fromPos);
  req.vel.set(this.getPlayerPos()).subtract(fromPos);
  this.shape = Body.Shape.CIRCLE;
  this.rad = PlayScreen.ENEMY_MISSILE_RAD;
  var resp = ScanResponse.alloc();
  var retval = null;
  var hit = this.world.rayscan(req, resp);
  var hitPlayer = this.isPlayerPathId(resp.pathId);
  if (hit && hitPlayer) {
    retval = outVec.set(req.vel);
  }
  resp.free();
  req.free();
  return retval;
};

PlayScreen.prototype.enemyFire = function(fromPos, vel) {
  this.initEnemyMissile(fromPos, vel);
  this.soundPew(fromPos);
};


////////////
// Sounds //
////////////

PlayScreen.prototype.soundPew = function(pos) {
  this.vec4.setXYZ(pos.x, pos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var freq = 1500 + 1500 * Math.random();
  var attack = 0.05;
  var sustain = (4 + Math.random() * 2) / 60;
  var decay = (20 + 10 * Math.random()) / 60;
  this.sfx.sound(x, y, 0, 0.15, attack, sustain, decay, freq, 0.5, 'sine');
  this.sfx.sound(x, y, 0, 0.1, attack, sustain, decay, freq * (2 + Math.random()), 0.5, 'square');
};

PlayScreen.prototype.soundBang = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var voices = 3;
  var maxLength = 0;
  var sustain = 0.05 * (Math.random() + 1);
  var baseFreq = (Math.random() + 0.5) * 100;
  for (var i = 0; i < voices; i++) {
    var attack = 0;
    var decay = sustain * 4;
    maxLength = Math.max(maxLength, attack + decay);
    var freq1 = baseFreq * (1 + i/3);
    var freq2 = 1 + i;
    this.sfx.sound(x, y, 0, 2/voices, attack, sustain, decay, freq1, freq2, 'square');
  }
};

PlayScreen.prototype.soundWallThump = function(worldPos, mag) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var vol = Math.min(1, mag*mag/300);
  if (vol > 0.01) {
    var dur = Math.min(0.1, 0.01 * mag*mag);
    var freq = mag + 200 + 5 * Math.random();
    var freq2 = 1;
    this.sfx.sound(x, y, 0, vol, 0, 0, dur, freq, freq2, 'square');
  }
};

PlayScreen.prototype.soundBodyCheck = function(worldPos, mag, mass) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var massSqrt = Math.sqrt(mass);
  var vol = Math.min(1, 0.005*mag*mag);
  if (vol > 0.01) {
    var freq = 200 + 10000 / massSqrt;
    var freq2 = 1;//freq/10;//freq * (1 + (Math.random() - 0.5) * 0.01);
    var dur = Math.min(0.2, Math.max(mass / 600, 0.05));
    this.sfx.sound(x, y, 0, vol, 0, 0, dur, freq, freq2, 'sine');
  }

};

PlayScreen.prototype.soundBing = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var voices = 2;
  var maxLength = 0;
  var sustain = 0.05 * (Math.random() + 0.5);
  var baseFreq = (Math.random() + 0.5) * 200;
  for (var i = 0; i < voices; i++) {
    var attack = 0;
    var decay = sustain * 4;
    maxLength = Math.max(maxLength, attack + decay);
    var freq1 = baseFreq * (1 + i/3);
    var freq2 = 1 + i;
    this.sfx.sound(x, y, 0, 2/voices * 0.3, attack, sustain, decay, freq1, freq2, 'square');
  }
};

PlayScreen.prototype.soundKaboom = function(worldPos) {
  this.vec4.setXYZ(worldPos.x, worldPos.y, 0).transform(this.viewMatrix);
  var x = this.vec4.v[0];
  var y = this.vec4.v[1];

  var voices = 8;
  for (var i = 0; i < voices; i++) {
    var delay = (i % 2 ? 0 : 0.1) * (1 + 0.1 * Math.random());
    var attack = 0.002;
    var sustain = 0.1 * (Math.random() + 0.01);
    var decay = (Math.random() + 1) * 0.5;
    var freq1 = Math.random() * 30 + 30;
    var freq2 = Math.random() * 10 + 10;
    this.sfx.sound(x, y, 0, 0.8, attack, sustain, decay, freq1, freq2, 'square', delay);
  }
};
