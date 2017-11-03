/**
 * @constructor
 * @extends {Game4BaseScreen}
 */
function Game4PlayScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game4BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.slots = {};
  this.widgets = [];

  this.viewCircles = [];

  this.defaultViewCircle = new Circle();
  this.defaultViewCircle.rad =
      Game4PlayScreen.PLAYER_VIEW_RADIUS
      * Game4PlayScreen.STARTING_VIEW_FRACTION;

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

Game4PlayScreen.EXIT_WARP_MULTIPLIER = 0.001;
Game4PlayScreen.EXIT_DURATION = 30 * Game4PlayScreen.EXIT_WARP_MULTIPLIER;

Game4PlayScreen.PLAYER_VIEW_RADIUS = 40;
Game4PlayScreen.STARTING_VIEW_FRACTION = 0.5;
Game4PlayScreen.PLAYER_VIEW_MIN_VISIBLE_FRAC = 0.6;

Game4PlayScreen.prototype.updateHudLayout = function() {
};

Game4PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;

  // This iterates through addListener(foo) registered listeners,
  // so test screen's untestWidget listening is taken care of here.
  Game4BaseScreen.prototype.setScreenListening.call(this, listen);

  var buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'),
      buttonEvents, this.fullScreenFn);
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
              x, y,
              self.canvas.width * (myCorner.getX() + 1 / 2),
              self.canvas.height * (myCorner.getY() + 1 / 2));
          for (var slotName in self.slots) {
            var otherSlot = self.slots[slotName];
            var otherCorner = otherSlot.corner;
            if (otherCorner && otherCorner !== myCorner && otherSlot.isPlaying()) {
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
            .add(ControlName.STICK, new PointerLockStick(document.body).setRadius(100))
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

  for (var i = 0; i < slotList.length; i++) {
    var slot = slotList[i];
    slot.setState(ControlState.WAITING);
    this.slots[slot.name] = slot;
  }
};

Game4PlayScreen.prototype.setPointerLockAllowed = function(allowed) {
  this.slots['pl'].setPointerLockAllowed(allowed);
};

Game4PlayScreen.prototype.startExit = function(pos) {
  if (this.exitStartTime) return;
  this.sounds.exit(pos);
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game4PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game4PlayScreen.EXIT_WARP_MULTIPLIER);
  this.splashes.addExitSplash(pos.x, pos.y, this.exitStartTime, Game4PlayScreen.EXIT_DURATION);
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
  for (var slotName in this.slots) {
    var slot = this.slots[slotName];
    var controls = slot.getControlList();
    if (slot.stateName === ControlState.PLAYING) {
      if (controls.get(ControlName.MENU).getVal()) {
        // TODO: Don't make the menu instantly drop players
        this.playerDrop(slot);
      } else {
        var playerSpirit = slot.spirit;
        if (playerSpirit) {
          playerSpirit.handleInput(controls);
        } else {
          if (slot.getDeathFraction(this.now()) <= 0) {
            this.playerSpawn(slot);
          }
        }
      }
    } else if (slot.stateName === ControlState.WAITING) {
      if (controls.get(ControlName.JOIN_TRIGGER).getVal()) {
        this.playerJoin(slot);
      }
    }
  }
};

Game4PlayScreen.prototype.playerJoin = function(slot) {
  if (slot.getDeathFraction(this.now()) <= 0) {
    slot.setState(ControlState.PLAYING);
    this.playerSpawn(slot);
  }
};

Game4PlayScreen.prototype.playerSpawn = function(slot) {
  slot.releaseControls();
  slot.setRespawnPos(this.defaultViewCircle.pos);

  var pos = new Vec2d(0, 0.5).rot(Math.PI * 2 * Math.random()).add(this.defaultViewCircle.pos);
  var spiritId = this.addItem(Game4BaseScreen.MenuItem.PLAYER, pos, 0);
  var spirit = this.world.spirits[spiritId];

  slot.setSpirit(spirit);
  var r = 1 - 0.5 * Math.random();
  var g = 1 - 0.5 * Math.random();
  var b = 1 - 0.5 * Math.random();
  spirit.setColorRGB(r, g, b);

  var body = spirit.getBody();
  this.sounds.playerSpawn(pos);
  this.splashes.addPlayerSpawnSplash(this.now(), pos, body.rad, spirit.color);
};

Game4PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  var slot = this.getSlotForPlayerSpirit(spirit);
  slot.killPlayerAtTime(this.now());
};

Game4PlayScreen.prototype.getSlotForPlayerSpirit = function(spirit) {
  for (var slotName in this.slots) {
    var slot = this.slots[slotName];
    if (slot.spirit === spirit) {
      return slot;
    }
  }
  return null;
};

Game4PlayScreen.prototype.playerDrop = function(slot) {
  slot.setRespawnPos(slot.camera.cameraPos);
  slot.killPlayerAtTime(this.now());
  slot.setState(ControlState.WAITING);
  this.defaultViewCircle.rad = 0.01;
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
      var antBody = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.ANT, b0, b1);
      if (antBody) {
        this.killPlayerSpirit(playerSpirit);
      }
      if (!antBody) {
        // TODO: thump on wall hit, not on "else"
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

    var tbb = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.TRACTOR_BULLET, b0, b1);
    if (tbb) {
      var tbbs = this.getSpiritForBody(tbb);
      tbbs.onHitOther(pos);
    }

    var ebb = this.bodyIfSpiritType(Game4BaseScreen.SpiritType.ENERGY_BULLET, b0, b1);
    if (ebb) {
      var ebbs = this.getSpiritForBody(ebb);
      var otherBody = this.otherBody(ebb, b0, b1);
      var otherSpirit = this.getSpiritForBody(otherBody);
      if (otherSpirit && otherSpirit.getEnergyCapacity()) {
        ebbs.onHitEnergizable(otherSpirit, pos);
      } else {
        ebbs.onHitOther(pos);
      }
    }

    vec.free();
  }
};

Game4PlayScreen.prototype.updateWarps = function() {
  var time = this.now() / 100;
  var maxRepulsorRad = 10;
  var repulsorProgress = ((time / 5) % 2) / 2;
  repulsorProgress = repulsorProgress > 1 ? 0 : repulsorProgress;
  var repulsorRad = Math.sqrt(maxRepulsorRad * maxRepulsorRad * Math.sin(repulsorProgress * Math.PI));
  var repulsorStrength = (1 - repulsorProgress) * (0.8 - repulsorProgress);

  var flowerMag = 8;
  var flowerAngle = -time * 2;

  this.renderer.setWarps(
      [1, 2, 3, 1, 0, 0, 0, 0],
      [
        // explodey-repulsor
        -5 + 5 * Math.sin(time*1.2),
        -5 + 5 * Math.sin(time*1.3),
        repulsorRad,
        repulsorStrength,

        // quantizer
        -5 + 5 * Math.sin(time),
        5 + 5 * Math.cos(time),
        6,
        4 + 2 * Math.sin(time*2),

        // flower
        5 + 4 * Math.sin(time*1.9),
        -5 + 4 * Math.cos(time*1.1),
        flowerMag*Math.sin(flowerAngle),
        flowerMag*Math.cos(flowerAngle),

        // vacuum repulsor
        5 + 3*Math.sin(time),
        5 + 3*Math.cos(time * 1.123),
        10 - repulsorRad,
        2 * (Math.sin(time*10) - 0.95),

        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
      ]
  );
};


Game4PlayScreen.prototype.drawScene = function() {
  var startTime = performance.now();

  this.updateViewCircles();
  this.positionCamera();
  this.updateViewMatrix();
  this.updateWarps();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setCircleMode(this.viewCircles);
  this.renderer.setTime(this.now());

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
  // update this.viewCircles to match all the player cameras,
  // or the starting area if there are no players now.
  var count = 0;
  var now = this.now();
  for (var slotName in this.slots) {
    var slot = this.slots[slotName];
    if (slot.updateViewCircle(now)) {
      this.viewCircles[count] = slot.circle;
      count++;
    }
  }
  if (count === 0) {
    // Everyone left. Expand the default view circle from near-zero
    // so there's something to look at.
    this.defaultViewCircle.rad =
        0.97 * this.defaultViewCircle.rad +
        0.03 * Game4PlayScreen.PLAYER_VIEW_RADIUS
          * Game4PlayScreen.STARTING_VIEW_FRACTION;
    this.viewCircles[0] = this.defaultViewCircle;
  } else {
    this.viewCircles.length = count;
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
      if (groupNum === this.getWallHitGroup()) {
        // Walls are drawn in a separate tile-drawing pass.
        continue;
      }
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
  var players = 0;

  for (var name in this.slots) {
    var slot = this.slots[name];
    if (slot.isPlaying() || slot.getDeathFraction(this.now())) {
      players++;
      var cam = slot.camera;
      if (players === 1) {
        this.viewableWorldRect.setPosXY(cam.getX(), cam.getY());
      } else {
        this.viewableWorldRect.coverXY(cam.getX(), cam.getY());
      }
    }
  }

  if (players === 0) {
    this.viewableWorldRect.setPos(this.defaultViewCircle.pos);
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
  this.camera.follow(this.viewableWorldRect.pos);
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
    if (slot.isPlaying()) {
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