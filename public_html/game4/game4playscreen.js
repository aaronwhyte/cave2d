/**
 * @constructor
 * @extends {Game4BaseScreen}
 */
function Game4PlayScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game4BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.playerSpirits = [];
  this.widgets = [];

  this.viewCircles = [];

  this.defaultViewCircle = new Circle();

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    // TODO: key tips for mouse and keyboard players?
    // for (var i = 0; i < self.players.length; i++) {
    //   self.players[i].setKeyboardTipTimeoutMs(ms);
    // }
    for (var i = 0; i < self.widgets.length; i++) {
      self.widgets[i].setKeyboardTipTimeoutMs(ms);
    }
  };

  this.restartFn = function(e) {
    e = e || window.event;
    self.controller.restartLevel();
    e.preventDefault();
  };

  this.initPauseButtons();
}
Game4PlayScreen.prototype = new Game4BaseScreen();
Game4PlayScreen.prototype.constructor = Game4PlayScreen;

Game4PlayScreen.TOUCH_STICK_RADIUS = 60;

Game4PlayScreen.EXIT_DURATION = 3;
Game4PlayScreen.EXIT_WARP_MULTIPLIER = 0.1;

Game4PlayScreen.RESPAWN_TIMEOUT = 30;
Game4PlayScreen.PLAYER_VIEW_RADIUS = 40;
Game4PlayScreen.PLAYER_VIEW_MIN_VISIBLE_FRAC = 0.6;

Game4PlayScreen.RESPAWN_TIMEOUT = 30;

Game4PlayScreen.prototype.updateHudLayout = function() {
};

Game4PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;

  // This iterates through addListener(foo) registered listeners,
  // so test screen's untestWidget listening is taken care of here.
  Game4BaseScreen.prototype.setScreenListening.call(this, listen);

  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'), buttonEvents, this.fullScreenFn);
  // TODO: resumeButton is ignored in testscreen - this is sloppy
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, document.querySelector('#restartButton'), buttonEvents, this.restartFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game4PlayScreen.prototype.initPauseButtons = function() {
  this.pauseKeyTrigger = new KeyTrigger();
  this.pauseKeyTrigger
      .addTriggerKeyByName(Key.Name.SPACE)
      .addTriggerDownListener(this.pauseDownFn);
  this.addListener(this.pauseKeyTrigger);

  this.pauseTouchWidget = new ClearDoubleTapWidget(this.getHudEventTarget());
  this.pauseTouchWidget
      .addDoubleTapListener(this.pauseDownFn)
      .setStamp(this.stamps.pauseStamp);
  var rule = new CuboidRule(this.canvasCuboid, this.pauseTouchWidget.getWidgetCuboid())
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(Vec4.ZERO, Vec4.ZERO)
      .setTargetAnchor(Vec4.ZERO, Vec4.ZERO)
      .setSizingMax(new Vec4(0.2, 0.2), new Vec4(50, 50));
  this.cuboidRules.push(rule);

  this.addListener(this.pauseTouchWidget);
};


Game4PlayScreen.prototype.configurePlayerSlots = function() {
  var self = this;
  function createKeyboardSlot(name, up, right, down, left, b1, b2, menuKey) {
    return new PlayerSlot(name)
        .add(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new KeyTrigger()
                .addTriggerKeyByName(up)
                .addTriggerKeyByName(right)
                .addTriggerKeyByName(down)
                .addTriggerKeyByName(left)
                .addTriggerKeyByName(b1)
                .addTriggerKeyByName(b2)
                .addTriggerKeyByName(menuKey)
            ))
        .add(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new KeyStick()
                .setUpRightDownLeftByName(up, right, down, left))
            .add(ControlName.BUTTON_1, new KeyTrigger().addTriggerKeyByName(b1))
            .add(ControlName.BUTTON_2, new KeyTrigger().addTriggerKeyByName(b2))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  function createTouchSlot(name, angle) {
    var buttonAngle = angle + Math.PI / 4;
    var releasedColor = new Vec4(1, 1, 1, 0.2);
    var pressedColor = new Vec4(1, 1, 1, 0.5);
    var matrix = new Matrix44().toRotateZOp(angle);

    function button(stamp) {
      return new TriggerWidget(self.getHudEventTarget())
          .setStamp(stamp)
          .setAngle(buttonAngle)
          .listenToTouch()
          .setPressedColorVec4(pressedColor)
          .setReleasedColorVec4(releasedColor);
    }

    var joinTrigger = button(self.stamps.joinButton);
    var n = Math.sqrt(0.5);
    var rule = new CuboidRule(self.canvasCuboid, joinTrigger.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-n, n).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(0.12, 0.12, 0.99), new Vec4(30, 30));
    self.cuboidRules.push(rule);

    var stick = new TouchStick(self.getWorldEventTarget())
        .setStartZoneFunction(function(x, y) {
          // If this touch is closer to the player's corner than it is to any other
          // active player's corner, then the player can have it.
          // That way inactive waiting-to-join slots don't detract from the other touch players.
          var myCorner = slot.corner;
          var distToMyCorner = Vec2d.distanceSq(
              x, y, self.canvas.width * (myCorner.getX() + 1 / 2), self.canvas.height * (myCorner.getY() + 1 / 2));
          for (var slotName in self.slots) {
            var otherSlot = self.slots[slotName];
            var otherCorner = otherSlot.corner;
            if (otherCorner && otherCorner !== myCorner && otherSlot.stateName !== ControlState.WAITING) {
              var otherCornerDist = Vec2d.distanceSq(
                  x, y,
                  self.canvas.width * (otherCorner.getX() + 1 / 2),
                  self.canvas.height * (otherCorner.getY() + 1 / 2));
              if (otherCornerDist <= distToMyCorner) {
                return false;
              }
            }
          }
          return true;
        })
        .setRadius(Game4PlayScreen.TOUCH_STICK_RADIUS);

    var buttonRad = 50;
    var maxButtonRatio = 1/5;
    var button1 = button(self.stamps.button1);
    var rule1 = new CuboidRule(self.canvasCuboid, button1.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1, 2.6).transform(matrix), new Vec4(-2, 0).transform(matrix))
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(rule1);

    var button2 = button(self.stamps.button2);
    var rule2 = new CuboidRule(self.canvasCuboid, button2.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-2.6, 1).transform(matrix), new Vec4(0, 2).transform(matrix))
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(rule2);

    var menuTrigger = button(self.stamps.menuButton);
    var menuRule = new CuboidRule(self.canvasCuboid, menuTrigger.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-n, n).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(0.12, 0.12, 0.99), new Vec4(30, 30));
    self.cuboidRules.push(menuRule);

    var slot = new PlayerSlot(name)
        .add(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, joinTrigger))
        .add(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, stick)
            .add(ControlName.BUTTON_1, button1)
            .add(ControlName.BUTTON_2, button2)
            .add(ControlName.MENU, menuTrigger));
    slot.corner = new Vec4(-1, 1).transform(matrix);
    return slot;
  }

  function createPointerLockSlot(name, b1, b2, menuKey) {
    // Only join on mouse-click, since that's a good indication you have a mouse in hand,
    // and it starts the Pointer Lock process.
    return new PlayerSlot(name)
        .add(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger()
                    .addTriggerKeyByName(b1)
                    .addTriggerKeyByName(b2)
                    .addTriggerKeyByName(menuKey))))
        .add(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new PointerLockStick(self.canvas).setRadius(100))
            .add(ControlName.BUTTON_1, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(b1)))
            .add(ControlName.BUTTON_2, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas).setListenToLeftButton(false))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(b2)))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  var slotList = [
    createKeyboardSlot('k1', Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, 'n', 'm', 'l'),
    createKeyboardSlot('k2', 'w', 'd', 's', 'a', Key.Name.SHIFT, 'z', 'q'),
    createPointerLockSlot('pl', 'v', 'b', 'g'),
    createTouchSlot('t1', 0),
    createTouchSlot('t2', Math.PI / 2),
    createTouchSlot('t3', Math.PI),
    createTouchSlot('t4', 3 * Math.PI / 2)
  ];

  this.slots = {};
  for (var i = 0; i < slotList.length; i++) {
    var slot = slotList[i];
    slot.setState(ControlState.WAITING);
    this.slots[slot.name] = slot;
  }
};

Game4PlayScreen.prototype.startExit = function(x, y) {
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game4PlayScreen.EXIT_DURATION;
  this.exitEndTime = this.exitStartTime + Game4PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game4PlayScreen.EXIT_WARP_MULTIPLIER);
  this.splashes.addExitSplash(x, y, this.exitStartTime, Game4PlayScreen.EXIT_DURATION);
};

Game4PlayScreen.prototype.exitLevel = function() {
  this.controller.exitLevel(this.createGameState());
};

Game4PlayScreen.prototype.snapCameraToEntrance = function() {
  for (var spiritId in this.world.spirits) {
    var spirit = this.world.spirits[spiritId];
    if (spirit.type === Game4BaseScreen.SpiritType.ENTRANCE) {
      this.entranceSpirit = spirit;
      break;
    }
  }
  if (this.entranceSpirit) {
    this.defaultViewCircle.pos.set(this.entranceSpirit.getBodyPos());
  }
  var pos = this.defaultViewCircle.pos;
  if (pos) {
    this.camera.set(pos);
  }
};

Game4PlayScreen.prototype.handleInput = function () {
  for (var i = 0; i < this.playerSpirits.length; i++) {
    this.playerSpirits[i].handleInput();
  }
  for (var slotName in this.slots) {
    var slot = this.slots[slotName];
    var controls = slot.getControlList();
    if (slot.stateName === ControlState.PLAYING) {
      if (controls.get(ControlName.MENU).getVal()) {
        this.playerDrop(slot);
      }
    } else if (slot.stateName === ControlState.WAITING) {
      if (controls.get(ControlName.JOIN_TRIGGER).getVal()) {
        this.playerJoin(slot);
      }
    }
  }
};

Game4PlayScreen.prototype.playerJoin = function(slot) {
  slot.setState(ControlState.PLAYING);
  this.playerSpawn(slot);
};

Game4PlayScreen.prototype.playerSpawn = function(slot) {
  slot.releaseControls();

  var pos = new Vec2d(0, 2).rot(Math.PI * 2 * Math.random()).add(this.defaultViewCircle.pos);
  var spiritId = this.addItem(Game4BaseScreen.MenuItem.PLAYER, pos, 0);
  slot.lastSpiritId = spiritId;
  var spirit = this.world.spirits[spiritId];

  spirit.setSlot(slot);
  var r = 1 - 0.5 * Math.random();
  var g = 1 - 0.5 * Math.random();
  var b = 1 - 0.5 * Math.random();
  spirit.setColorRGB(r, g, b);
  this.playerSpirits.push(spirit);

  var body = spirit.getBody();
  this.sounds.playerSpawn(pos);
  this.splashes.addPlayerSpawnSplash(this.now(), pos, body.rad, spirit.color);
};

Game4PlayScreen.prototype.playerDrop = function(slot) {
  var playerSpirit = this.world.spirits[slot.lastSpiritId];
  if (playerSpirit) {
    this.killPlayerSpirit(playerSpirit);
  }
  slot.setState(ControlState.WAITING);
};

Game4PlayScreen.prototype.onTimeout = function(e) {
  var slot = this.getSlotFromRespawnTimeOutVal(e.timeoutVal);
  if (slot && slot.stateName !== ControlState.WAITING) {
    this.playerSpawn(slot);
  }
};

Game4PlayScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var playerBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.PLAYER, b0, b1);
    if (playerBody) {
      var playerSpirit = this.getSpiritForBody(playerBody);
      var exitBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.EXIT, b0, b1);
      if (exitBody && !this.exitStartTime) {
        var exitPos = exitBody.getPosAtTime(this.now(), this.vec2d);
        this.sounds.exit(exitPos);
        this.startExit(exitPos.x, exitPos.y);
      }
      var antBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        this.schedulePlayerRespawn(playerSpirit.slot);
        this.killPlayerSpirit(playerSpirit);
      }
      if (!exitBody && !antBody) {
        this.sounds.wallThump(pos, mag * 10);
      }
    }

    var bulletBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.BULLET, b0, b1);
    if (bulletBody) {
      var bulletSpirit = this.getSpiritForBody(bulletBody);
      var otherBody = this.otherBody(bulletBody, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (!otherSpirit) {
        // wall?
        bulletSpirit.onHitWall(mag, pos);
      } else if (otherSpirit.type === Game4BaseScreen.SpiritType.ANT) {
        otherSpirit.onPlayerBulletHit(bulletSpirit.damage);
        bulletSpirit.onHitEnemy(mag, pos);
      } else if (otherSpirit.type === Game4BaseScreen.SpiritType.BULLET) {
        bulletSpirit.onHitOther(mag, pos);
        otherSpirit.onHitOther(mag);
      } else {
        bulletSpirit.onHitOther(mag, pos);
      }
    }

    var abb = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.ACTIVATOR_BULLET, b0, b1);
    if (abb) {
      var abbs = this.getSpiritForBody(abb);
      var otherBody = this.otherBody(abb, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (otherSpirit && otherSpirit.isActivatable()) {
        abbs.onHitActivatable(otherSpirit, pos);
      } else {
        abbs.onHitOther(pos);
      }
    }

    vec.free();
  }
};

Game4PlayScreen.prototype.drawScene = function() {
  var startTime = performance.now();

  this.updateViewCircles();
  this.positionCamera();
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setCircleMode(this.viewCircles);

  this.drawSpiritsOverlappingCircles(this.viewCircles);
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTilesOverlappingCircles(this.viewCircles);

  this.splasher.draw(this.renderer, this.world.now);

  this.renderer.setNormalMode();
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game4PlayScreen.prototype.updateViewCircles = function() {
  // update this.viewCircles to match all the player cameras, or the starting area if there are no players now.
  var count = 0;
  for (var i = 0; i < this.playerSpirits.length; i++) {
    var spirit = this.playerSpirits[i];
    spirit.circle.pos.set(spirit.camera.cameraPos);
    spirit.circle.rad = Game4PlayScreen.PLAYER_VIEW_RADIUS;
    this.viewCircles[i] = spirit.circle;
    count++;
  }
  this.viewCircles.length = count;
  if (count === 0) {
    this.defaultViewCircle.rad = Game4PlayScreen.PLAYER_VIEW_RADIUS;
    this.viewCircles[0] = this.defaultViewCircle;
  }
};

Game4PlayScreen.prototype.drawSpiritsOverlappingCircles = function(circles) {
  var cellIdSet = ObjSet.alloc();
  var spiritIdSet = ObjSet.alloc();
  var i;
  for (i = 0; i < circles.length; i++) {
    this.world.addCellIdsOverlappingCircle(cellIdSet, circles[i]);
  }
  for (var cellId in cellIdSet.vals) {
    for (var groupNum = 0; groupNum < this.world.getGroupCount(); groupNum++) {
      if (groupNum === this.getWallHitGroup()) continue;
      this.world.addSpiritIdsInCellAndGroup(spiritIdSet, cellId, groupNum);
    }
  }
  for (var spiritId in spiritIdSet.vals) {
    var spirit = this.world.spirits[spiritId];
    if (spirit) spirit.onDraw(this.world, this.renderer);
  }

  // HACKish: draw disembodied spirits too, like dead bullets that are still leaving trails
  for (var spiritId in this.world.spirits) {
    var spirit = this.world.spirits[spiritId];
    if (!spirit.bodyId) spirit.onDraw(this.world, this.renderer);
  }

  spiritIdSet.free();
  cellIdSet.free();
};

Game4PlayScreen.prototype.positionCamera = function() {
  this.viewableWorldRect.rad.reset();
  if (this.playerSpirits.length === 0) {
    this.viewableWorldRect.setPos(this.defaultViewCircle.pos);
  } else {
    for (var i = 0; i < this.playerSpirits.length; i++) {
      var spirit = this.playerSpirits[i];
      var playerCamera = spirit.camera;
      if (i === 0) {
        this.viewableWorldRect.setPosXY(playerCamera.getX(), playerCamera.getY());
      } else {
        this.viewableWorldRect.coverXY(playerCamera.getX(), playerCamera.getY());
      }
    }
  }
  var pad = Game4PlayScreen.PLAYER_VIEW_RADIUS * Game4PlayScreen.PLAYER_VIEW_MIN_VISIBLE_FRAC;
  this.viewableWorldRect.padXY(pad, pad);

  var destPixelsPerMeter = Math.min(
      2 * this.canvas.width / this.viewableWorldRect.getWidth(),
      2 * this.canvas.height / this.viewableWorldRect.getHeight());
  if (destPixelsPerMeter < this.pixelsPerMeter) {
    // zoom out quickly
    this.pixelsPerMeter = destPixelsPerMeter;
  } else {
    // zoom in slowly
    this.pixelsPerMeter = (this.pixelsPerMeter * 29 + destPixelsPerMeter) / 30;
  }

  // gently update the camera position
  this.camera.cameraPos.scale(4).add(this.viewableWorldRect.pos).scale(1/5);
};

Game4PlayScreen.prototype.getPixelsPerMeter = function() {
  return this.pixelsPerMeter;
};

Game4PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  for (var slotName in this.slots) {
    this.slots[slotName].getControlList().draw(this.renderer);
  }
  for (var i = 0; i < this.widgets.length; i++) {
    this.widgets[i].draw(this.renderer);
  }
  this.pauseTouchWidget.draw(this.renderer);
  this.renderer.setBlendingEnabled(false);
};
Game4PlayScreen.prototype.isPlaying = function() {
  return true;
};

Game4PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  spirit.explode();
  this.sounds.playerExplode(spirit.getBodyPos());
  this.removeByBodyId(spirit.bodyId);
  for (var i = 0; i < this.playerSpirits.length; i++) {
    if (this.playerSpirits[i] === spirit) {
      this.playerSpirits[i] = this.playerSpirits[this.playerSpirits.length - 1];
      this.playerSpirits.pop();
      break;
    }
  }
};

Game4PlayScreen.prototype.schedulePlayerRespawn = function(slot) {
  this.world.addTimeout(this.now() + Game4PlayScreen.RESPAWN_TIMEOUT, null, this.getRespawnTimeoutValForSlot(slot));
};

Game4PlayScreen.prototype.getRespawnTimeoutValForSlot = function(slot) {
  return ['respawn', slot.name, slot.lastSpiritId];
};

Game4PlayScreen.prototype.getSlotFromRespawnTimeOutVal = function(timeoutVal) {
  if (!timeoutVal || 'respawn' !== timeoutVal[0]) return null;
  var slotName = timeoutVal[1];
  var lastSpiritId = timeoutVal[2];
  var slot = this.slots[slotName];
  // make sure there wasn't a new spirit created for this slot since the timeout was created
  if (slot && slot.lastSpiritId === lastSpiritId) {
    return slot;
  }
  return null;
};

/**
 * Returns a JSON object like
 * <code>
 * {
 *   players: [
 *     { slotName: k1 },
 *     { slotName: k2 }
 *   ]
 * }
 * </code>
 */
Game4PlayScreen.prototype.createGameState = function() {
  var players = [];
  for (var name in this.slots) {
    var slot = this.slots[name];
    if (slot.stateName !== ControlState.WAITING) {
      players.push({
        slotName: name
      });
    }
  }
  return {
    players: players
  }
};

Game4PlayScreen.prototype.restoreGameState = function(state) {
  if (!state) {
    return;
  }
  var players = state.players;
  for (var i = 0; i < players.length; i++) {
    var player = players[i];
    this.playerJoin(this.slots[player.slotName]);
  }
};