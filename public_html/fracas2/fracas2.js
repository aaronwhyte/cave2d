/**
 * The whole Fracas2 game, including the start screen, all the levels, game-over, etc.
 * @constructor
 */
function Fracas2(canvas) {
  this.canvas = canvas;
  this.levelPaths = [];

  // Parallel to levelPaths.
  // Deserialize a level when the player plays it.
  this.levelStrings = [];

  // async state loading state. Hm.
  this.waitingForState = null;
  this.waitingForLevelIndex = null;

  // async shader loading state
  this.requestedShaders = false;
  this.vertexShader = null;
  this.fragmentShader = null;

  // final artifact of shader loading
  this.renderer = null;

  // for canceling a RequestAnimationFrame
  this.rafKey = null;

  this.levelNum = 0;

  this.cameraPos = new Vec2d();

  this.gnomeDist = GnomeSpirit.MAX_SCAN_DIST;
  this.zoomFactor = 1;
}

Fracas2.Reaction = {
  BOUNCE: 1,

  DESTROY_BULLET: 2,
  DESTROY_GNOME: 4,
  DESTROY_GENERATOR: 8,
  DESTROY_BRICK: 16,

  COLLECT_HEALTH: 32,
  COLLECT_GOLD: 64,

  DESTROY_PLAYER: 128,
  EXIT_LEVEL: 512
};

Fracas2.SPACING = 2;
Fracas2.CHARACTER_RADIUS = 0.6 * 0.5 * Fracas2.SPACING;
Fracas2.WALL_Z = 0.2;

Fracas2.CLOCKS_PER_SECOND = 60 * 0.3;

Fracas2.State = {
  MAIN_MENU: 'main_menu',
  PLAY_LEVEL: 'play_level'
};

Fracas2.Group = {
  WALL: 0,
  PLAYER: 1,
  PLAYER_BULLET: 2,
  PLAYER_ITEM: 3,
  GNOME: 4,
  GNOME_SCAN: 5,
  GENERATOR_SCAN: 6
};

Fracas2.GROUP_COUNT = 7;

Fracas2.GROUP_PAIRS = [
  [Fracas2.Group.PLAYER, Fracas2.Group.WALL],

  [Fracas2.Group.PLAYER_BULLET, Fracas2.Group.WALL],

  [Fracas2.Group.PLAYER_ITEM, Fracas2.Group.PLAYER],

  [Fracas2.Group.GNOME, Fracas2.Group.WALL],
  [Fracas2.Group.GNOME, Fracas2.Group.PLAYER],
  [Fracas2.Group.GNOME, Fracas2.Group.PLAYER_BULLET],
  [Fracas2.Group.GNOME, Fracas2.Group.GNOME],

  [Fracas2.Group.GNOME_SCAN, Fracas2.Group.WALL],
  [Fracas2.Group.GNOME_SCAN, Fracas2.Group.PLAYER],

  [Fracas2.Group.GENERATOR_SCAN, Fracas2.Group.WALL],
  [Fracas2.Group.GENERATOR_SCAN, Fracas2.Group.PLAYER],
  [Fracas2.Group.GENERATOR_SCAN, Fracas2.Group.PLAYER_BULLET],
  [Fracas2.Group.GENERATOR_SCAN, Fracas2.Group.GNOME]
];

Fracas2.prototype.stopWaitingForState = function() {
  this.waitingForState = null;
  this.waitingForLevelIndex = null;
};

Fracas2.prototype.beginMainMenu = function() {
  this.stopWaitingForState();
  this.state = Fracas2.State.MAIN_MENU;
  this.invalidate();

  // TODO: actually have a menu
  this.levelNum = 0;
  this.beginPlayingLevel();
};

Fracas2.prototype.beginPlayingLevel = function() {
  this.waitingForState = Fracas2.State.PLAY_LEVEL;
  // TODO: you win if you finish the last level
  this.waitingForLevelIndex = this.levelNum % this.levelPaths.length;
  this.invalidate();
};

Fracas2.prototype.startLoadingLevels = function(levelPaths) {
  this.levelPaths = levelPaths;
  this.levelStrings = [];
  for (var i = 0; i < levelPaths.length; i++) {
    var path = levelPaths[i];
    this.loadText(path, this.getOnLevelLoadedFunc(i));
  }
};

Fracas2.prototype.getOnLevelLoadedFunc = function(index) {
  var self = this;
  return function(text) {
    self.levelStrings[index] = text;
//    console.log('level ' + index + ':\n' + text);
    self.invalidate();
  };
};

Fracas2.prototype.invalidate = function() {
//  console.log('invalidate');
  this.maybeRequestShaders();
  this.maybeCreateRenderer();
  this.maybeStartLevel();
};

Fracas2.prototype.maybeRequestShaders = function() {
  if (this.requestedShaders) return;

  this.requestedShaders = true;
  var self = this;
  this.loadText('vertex-shader.txt', function(text) {
    self.vertexShaderText = text;
    self.invalidate();
  });
  this.loadText('fragment-shader.txt', function(text) {
    self.fragmentShaderText = text;
    self.invalidate();
  });
};

Fracas2.prototype.maybeCreateRenderer = function() {
  if (this.renderer || !this.vertexShaderText || !this.fragmentShaderText) return;

  var gl = getWebGlContext(this.canvas, {
    alpha: true,
    antialias: false
  });
  var vertexShader = compileShader(gl, this.vertexShaderText, gl.VERTEX_SHADER);
  var fragmentShader = compileShader(gl, this.fragmentShaderText, gl.FRAGMENT_SHADER);
  var program = createProgram(gl, vertexShader, fragmentShader);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);
  this.renderer = new Renderer(this.canvas, gl, program);
  this.invalidate();
};

Fracas2.prototype.loadText = function(path, callback) {
//  console.log('loadText ', path);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.responseType = 'text';
  xhr.onload = function() {
    callback(this.response);
  };
  xhr.send();
};

Fracas2.prototype.maybeStartLevel = function() {
//  console.log('maybeStartLevel');
  if (!this.waitingForState == Fracas2.State.PLAY_LEVEL ||
      !this.levelStrings[this.waitingForLevelIndex] ||
      !this.renderer) {
//    console.log('maybeStartLevel nope: ', this.waitingForState, this.levelStrings, this.renderer);
    return;
  }
  var levelIndex = this.waitingForLevelIndex;
  this.stopWaitingForState();
  this.state = Fracas2.State.PLAY_LEVEL;
  this.initWorldFromString(this.levelStrings[levelIndex]);
  this.initRendererBuffers();
  this.loopCallback = this.loop.bind(this);
  this.loop();
};

Fracas2.prototype.initWorldFromString = function(s) {
  this.gnomeDist = GnomeSpirit.MAX_SCAN_DIST;

  this.playerBody = new Body();
  var vec = new Vec2d();
  var x = 0, y = 0;

  function xy() {
    return vec.setXY(x, y).scale(Fracas2.SPACING);
  }

  function rr() {
    return vec.setXY(1, 1).scale(Fracas2.SPACING * 0.5);
  }

  this.resolver = new HitResolver();
  this.world = new World(Fracas2.SPACING * 2.9127, Fracas2.GROUP_COUNT, Fracas2.GROUP_PAIRS);
  this.wallSpiritId = this.world.addSpirit(new WallSpirit());
  this.exitSpiritId = this.world.addSpirit(new ExitSpirit());
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    switch (c) {
      case '\n':
        // new line
        y--;
        x = 0;
        continue;
      case '\r':
        // ignore
        continue;
      case '#':
        // wall
        var b = Body.alloc();
        b.spiritId = this.wallSpiritId;
        b.hitGroup = Fracas2.Group.WALL;
        b.setPosAtTime(xy(), 1);
        b.shape = Body.Shape.RECT;
        b.rectRad.set(rr());
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        this.world.addBody(b);
        break;
      case '=':
        // brick (destructible wall)
        var b = Body.alloc();
        var brickSpirit = new BrickSpirit();
        b.spiritId = this.world.addSpirit(brickSpirit);
        b.hitGroup = Fracas2.Group.WALL;
        b.setPosAtTime(xy(), 1);
        b.shape = Body.Shape.RECT;
        b.rectRad.set(rr());
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        brickSpirit.bodyId = this.world.addBody(b);
        break;
      case '$':
        // gold
        var b = Body.alloc();
        var goldSpirit = new GoldSpirit();
        b.spiritId = this.world.addSpirit(goldSpirit);
        b.hitGroup = Fracas2.Group.WALL;
        b.setPosAtTime(xy(), 1);
        b.shape = Body.Shape.CIRCLE;
        b.rad = Fracas2.CHARACTER_RADIUS * 1.1;
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        goldSpirit.bodyId = this.world.addBody(b);
        break;
      case 'G':
        // generator
        this.addGeneratorToWorld(xy());
        break;
      case '.':
        // floor
        break;
      case '>':
        // exit
        var b = Body.alloc();
        b.spiritId = this.exitSpiritId;
        b.hitGroup = Fracas2.Group.WALL;
        b.setPosAtTime(xy(), 1);
        b.shape = Body.Shape.RECT;
        b.rectRad.set(vec.setXY(1, 1).scale(Fracas2.SPACING * 0.33));
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        this.world.addBody(b);
        break;
      case '@':
        // player
        this.addPlayerToWorld(xy());
        break;
      case 'g':
        // gnome
        this.addGnomeToWorld(xy());
        break;
      default:
    }
    x++;
  }
};

Fracas2.prototype.addPlayerToWorld = function(position) {
  // Init the player body early, so the gnomes can have something to hunt for.
  var b = this.playerBody;
  b.hitGroup = Fracas2.Group.PLAYER;
  b.setPosAtTime(position, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = Fracas2.CHARACTER_RADIUS;
  b.pathDurationMax = PlayerSpirit.TIMEOUT;

  var bodyId = this.world.addBody(b);
  var spirit = new PlayerSpirit(this);
  var spiritId = this.world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  this.playerSpirit = spirit;
  b.spiritId = spiritId;
  this.world.addTimeout(this.world.now + PlayerSpirit.TIMEOUT, spiritId, null);

  var self = this;
  var aimStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT)
          .startListening())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('i', 'l', 'k', 'j')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x > self.canvas.width / 2;
          })
          .setRadius(10)
          .startListening())
      .addStick((new PointerLockStick())
          .setRadius(20)
          .setCanvas(this.canvas)
          .startListening());

  var moveStick = (new MultiStick())
      .addStick((new KeyStick())
          .setUpRightDownLeftByName('w', 'd', 's', 'a')
          .startListening())
      .addStick((new TouchStick())
          .setStartZoneFunction(function(x, y) {
            return x <= self.canvas.width / 2;
          })
          .setRadius(20)
          .startListening());

  this.playerSpirit.setAimStick(aimStick);
  this.playerSpirit.setMoveStick(moveStick);
};

Fracas2.prototype.addGnomeToWorld = function(position, opt_velocity, opt_timeout) {
  var timeout = opt_timeout || (this.world.now + Math.random() * GnomeSpirit.BORED_TIMEOUT);
  var b = new Body();
  var vel = opt_velocity || Vec2d.ZERO;
  b.hitGroup = Fracas2.Group.GNOME;
  b.setPosAtTime(position, this.world.now);
  b.setVelAtTime(vel, this.world.now);
  b.shape = Body.Shape.CIRCLE;
  b.rad = Fracas2.CHARACTER_RADIUS;
  b.mass = 2;
  b.pathDurationMax = GnomeSpirit.BORED_TIMEOUT;

  var bodyId = this.world.addBody(b);
  var spirit = new GnomeSpirit(this);
  spirit.setTargetBody(this.playerBody);
  var spiritId = this.world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  b.spiritId = spiritId;

  this.world.addTimeout(timeout, spiritId, null);
};

Fracas2.prototype.addGeneratorToWorld = function(position) {
  var b = Body.alloc();
  b.hitGroup = Fracas2.Group.WALL;
  b.setPosAtTime(position, 1);
  b.shape = Body.Shape.RECT;
  b.rectRad.set(new Vec2d(1, 1).scale(Fracas2.SPACING * 0.33));
  b.mass = Infinity;
  b.pathDurationMax = Infinity;

  var bodyId = this.world.addBody(b);
  var spirit = new GeneratorSpirit(this);
  var spiritId = this.world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  b.spiritId = spiritId;

  this.world.addTimeout(this.world.now + GeneratorSpirit.TIMEOUT * (0.5 * Math.random()), b.spiritId, null);
};

Fracas2.prototype.initRendererBuffers = function() {
  var triBuilder = new TriangleBufferBuilder(this.renderer.gl);
  var vec = new Vec2d();
  for (var id in this.world.bodies) {
    var body = this.world.bodies[id];
    var spirit = this.world.spirits[body.spiritId];
    if (spirit instanceof WallSpirit) {
      var red = Math.random() / 10;
      var green = Math.random() / 10;
      var blue = 1 - Math.random() / 10;
      var alpha = 1;
      triBuilder.addRect(body.getPosAtTime(1, vec), Fracas2.WALL_Z, body.rectRad, red, green, blue, alpha);
    }
  }
  this.renderer.setBackgroundTriangleVertexes(
      triBuilder.createPositionBuff(),
      triBuilder.createColorBuff(),
      triBuilder.getTriangleCount());
};

Fracas2.prototype.loop = function() {
  if (this.world === null || this.renderer === null) return;
  this.rafKey = requestAnimationFrame(this.loopCallback, this.canvas);
  this.frameEndMs = Date.now() + 1000 / 70;

  this.renderer.maybeResize();

  var playerPos = this.playerBody.getPosAtTime(this.world.now + 2, Vec2d.alloc());
  var playerVel = Vec2d.alloc().set(this.playerBody.vel);
  this.cameraPos.scale(0.9).add(
      playerPos
          .add(playerVel.scale(0.1))
          .scale(0.1));
  this.renderer.drawScene(this.world, this.cameraPos, 1);
  playerPos.free();
  this.clock();
};

Fracas2.prototype.clock = function() {
  var clockScale = 1;
  this.gnomeDist = Math.min(1.02 * this.gnomeDist, GnomeSpirit.MAX_SCAN_DIST);
  if (this.playerSpirit && this.playerSpirit.health == 1) {
    clockScale = Math.min(10, this.gnomeDist - 1.5 * Fracas2.CHARACTER_RADIUS) / 10;
  }
  var endClock = this.world.now + Fracas2.CLOCKS_PER_SECOND * clockScale * (1/60);
  var e = this.world.getNextEvent();
  // Stop if there are no more events to process,
  // or we've moved the game clock far enough ahead to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.
  while (e && e.time <= endClock && Date.now() < this.frameEndMs) {
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = this.world.getBodyByPathId(e.pathId0);
      var b1 = this.world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        var s0 = this.world.spirits[b0.spiritId];
        var s1 = this.world.spirits[b1.spiritId];
        var reaction0, reaction1;
        reaction0 = reaction1 = Fracas2.Reaction.BOUNCE;
        if (s0) {
          reaction0 = s0.onHit(this.world, b0, b1, e);
        }
        if (s1) {
          reaction1 = s1.onHit(this.world, b1, b0, e);
        }
        if ((reaction0 & Fracas2.Reaction.BOUNCE) && (reaction1 & Fracas2.Reaction.BOUNCE)) {
          this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
        }
        this.processReaction(b0, s0, reaction0);
        this.processReaction(b1, s1, reaction1);
      }
    }
    this.world.processNextEvent();
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};

Fracas2.prototype.processReaction = function(body, spirit, reaction) {
  if (reaction & Fracas2.Reaction.DESTROY_BULLET) {
    this.destroyBullet(spirit);
  } else if (reaction & Fracas2.Reaction.DESTROY_GNOME) {
    this.destroyGnome(spirit);
  } else if (reaction & Fracas2.Reaction.DESTROY_GENERATOR) {
    this.destroyGenerator(spirit);
  } else if (reaction & Fracas2.Reaction.DESTROY_BRICK) {
    this.destroyBrick(spirit);
  } else if (reaction & Fracas2.Reaction.COLLECT_GOLD) {
    this.collectGold(spirit);
  } else if (reaction & Fracas2.Reaction.DESTROY_PLAYER) {
    this.gameOver(spirit);
  } else if (reaction & Fracas2.Reaction.EXIT_LEVEL) {
    this.levelNum++;
    cancelAnimationFrame(this.rafKey);
    this.beginPlayingLevel();
  }
};

/**
 * Removes the spirit and its body from the world, and frees them if they are pooled.
 * @param spirit
 */
Fracas2.prototype.removeSpiritAndBody = function(spirit) {
  this.world.removeSpiritId(spirit.id);
  this.world.removeBodyId(spirit.bodyId);
};


Fracas2.prototype.destroyBullet = function(spirit) {
  this.removeSpiritAndBody(spirit);
  // TODO: explosion!
};

Fracas2.prototype.destroyGnome = function(spirit) {
  this.removeSpiritAndBody(spirit);
  // TODO: explosion!
};

Fracas2.prototype.destroyGenerator = function(spirit) {
  this.removeSpiritAndBody(spirit);
  // TODO: explosion!
};

Fracas2.prototype.destroyBrick = function(spirit) {
  this.removeSpiritAndBody(spirit);
  // TODO: explosion!
};

Fracas2.prototype.collectGold = function(spirit) {
  this.removeSpiritAndBody(spirit);
  // TODO: explosion!
};

Fracas2.prototype.gameOver = function(spirit) {
  cancelAnimationFrame(this.rafKey);

  // Start the current level over, for now.
  this.beginPlayingLevel();
  // TODO: explosion!
};

Fracas2.prototype.gnomeAtDist = function(dist) {
  if (dist < this.gnomeDist) {
    this.gnomeDist = dist;
  }
};
