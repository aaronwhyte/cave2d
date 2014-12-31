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

  this.loopCallback = this.loop.bind(this);
}

Fracas2.SPACING = 2;
Fracas2.CHARACTER_RADIUS = 0.4 * 0.5 * Fracas2.SPACING;
Fracas2.WALL_Z = 0.2;

Fracas2.CLOCKS_PER_SECOND = 60 * 0.3;

Fracas2.State = {
  MAIN_MENU: 'main_menu',
  PLAY_LEVEL: 'play_level'
};

Fracas2.prototype.stopWaitingForState = function() {
  this.waitingForState = null;
  this.waitingForLevelIndex = null;
};

Fracas2.prototype.beginMainMenu = function() {
  this.stopWaitingForState();
  this.state = Fracas2.State.MAIN_MENU;
  this.invalidate();

  // TODO: actually have a menu
  this.beginPlayingLevel(1);
};

Fracas2.prototype.beginPlayingLevel = function(levelIndex) {
  this.waitingForState = Fracas2.State.PLAY_LEVEL;
  this.waitingForLevelIndex = levelIndex;
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
    alpha: false,
    antialias: true
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
  console.log('loadText ', path);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', path, true);
  xhr.responseType = 'text';
  xhr.onload = function() {
    callback(this.response);
  };
  xhr.send();
};

Fracas2.prototype.maybeStartLevel = function() {
  console.log('maybeStartLevel');
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
  this.loop();
};

Fracas2.prototype.initWorldFromString = function(s) {
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
  this.world = new World();
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    switch (c) {
      case '\n':
        // new line
        y--;
        x = 0;
        continue;
      case '#':
        // wall
        var b = Body.alloc();
        b.setPosAtTime(xy(), 1);
        b.shape = Body.Shape.RECT;
        b.rectRad.set(rr());
        b.mass = Infinity;
        b.pathDurationMax = Infinity;
        this.world.addBody(b);
        break;
      case '.':
        // floor
        break;
      case '@':
        // player
        this.addPlayerToWorld(xy());
        break;
      case 'g':
        // gnome
        this.addGnomeToWorld(xy());
        break;
      case '\r':
        // ignore
        break;
      default:
        console.log('skipping unhandled character', c);
    }
    x++;
  }
};

Fracas2.prototype.addPlayerToWorld = function(position) {
  // Init the player body early, so the gnomes can have something to hunt for.
  var b = this.playerBody;

  b.setPosAtTime(position, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = Fracas2.CHARACTER_RADIUS;
  b.pathDurationMax = PlayerSpirit.TIMEOUT;

  var bodyId = this.world.addBody(b);
  var spirit = new PlayerSpirit();
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

Fracas2.prototype.addGnomeToWorld = function(position) {
  var b = new Body();
  b.setPosAtTime(position, 1);
  b.shape = Body.Shape.CIRCLE;
  b.rad = Fracas2.CHARACTER_RADIUS;
  b.pathDurationMax = GnomeSpirit.BORED_TIMEOUT;

  var bodyId = this.world.addBody(b);
  var spirit = new GnomeSpirit();
  spirit.setTargetBody(this.playerBody);
  var spiritId = this.world.addSpirit(spirit);
  spirit.bodyId = bodyId;
  b.spiritId = spiritId;
  this.world.addTimeout(this.world.now + Math.random() * GnomeSpirit.BORED_TIMEOUT, spiritId, null);
};

Fracas2.prototype.initRendererBuffers = function() {
  var triBuilder = new TriangleBufferBuilder(this.renderer.gl);
  var vec = new Vec2d();
  for (var id in this.world.bodies) {
    var body = this.world.bodies[id];
    if (body.mass == Infinity) {
      // TODO: Identify walls more explicitly
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
  this.frameEndMs = Date.now() + 1000 / 60;
  this.renderer.maybeResize();
  this.renderer.drawScene(this.world, this.playerBody);
  this.clock();
  requestAnimationFrame(this.loopCallback, this.canvas);
};

Fracas2.prototype.clock = function() {
  // Reserve at least a little time for physics, so we make some progress even if rendering blew through
  // our time budget.
  this.frameEndMs = Math.max(this.frameEndMs, Date.now() + 0.1 * 1000 / 60);
  var endClock = this.world.now + Fracas2.CLOCKS_PER_SECOND * (1/60);
  var e = this.world.getNextEvent();
  // Stop if there are no more events to process,
  // or we've moved the game clock far enough ahead to match the amount of wall-time elapsed since the last frame,
  // or (worst case) we're out of time for this frame.
  while (e && e.time <= endClock && Date.now() < this.frameEndMs) {
    if (e.type == WorldEvent.TYPE_HIT) {
      var b0 = this.world.getBodyByPathId(e.pathId0);
      var b1 = this.world.getBodyByPathId(e.pathId1);
      if (b0 && b1) {
        this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
        var s0 = this.world.spirits[b0.spiritId];
        if (s0) s0.onHit(this.world, b0, b1, e);
        var s1 = this.world.spirits[b1.spiritId];
        if (s1) s1.onHit(this.world, b1, b0, e);
      }
    }
    this.world.processNextEvent();
    e = this.world.getNextEvent();
  }
  if (!e || e.time > endClock) {
    this.world.now = endClock;
  }
};
