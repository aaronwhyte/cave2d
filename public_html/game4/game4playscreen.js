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
  function createKeyboardSlot(up, right, down, left, b1, b2, menuKey) {
    return new PlayerSlot()
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

  function createTouchSlot(angle) {
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
          for (var i = 0; i < self.slots.length; i++) {
            var otherSlot = self.slots[i];
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
        .setRadius(60);

    var buttonRad = 45;
    var maxButtonRatio = 1/6;
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

    var slot = new PlayerSlot()
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

  function createPointerLockSlot(b1, b2, menuKey) {
    // Only join on mouse-click, since that's a good indication you have a mouse in hand,
    // and it starts the Pointer Lock process.
    return new PlayerSlot()
        .add(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger()
                    .addTriggerKeyByName(b1)
                    .addTriggerKeyByName(b2)
                    .addTriggerKeyByName(menuKey))))
        .add(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new PointerLockStick(self.canvas).setRadius(180))
            .add(ControlName.BUTTON_1, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(b1)))
            .add(ControlName.BUTTON_2, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas).setListenToLeftButton(false))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(b2)))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  this.slots = [
    createKeyboardSlot(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, 'n', 'm', 'l'),
    createKeyboardSlot('w', 'd', 's', 'a', Key.Name.SHIFT, 'z', 'q'),
    createPointerLockSlot('v', 'b', 'g'),
    createTouchSlot(0),
    createTouchSlot(Math.PI / 2),
    createTouchSlot(Math.PI),
    createTouchSlot(3 * Math.PI / 2)
  ];

  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    slot.id = this.world.newId();
    slot.setState(ControlState.WAITING);
  }
};



Game4PlayScreen.prototype.startExit = function(x, y) {
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game4PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game4PlayScreen.EXIT_WARP_MULTIPLIER);

  // giant tube implosion
  var s = this.splash;
  s.reset(Game4BaseScreen.SplashType.WALL_DAMAGE, this.stamps.tubeStamp);

  s.startTime = this.exitStartTime;
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

Game4PlayScreen.prototype.exitLevel = function() {
  this.controller.exitLevel();
};

Game4PlayScreen.prototype.snapCameraToPlayers = function() {
  var pos = this.getAveragePlayerPos();
  if (pos) {
    this.camera.set(pos);
  }
};

Game4PlayScreen.prototype.handleInput = function () {
  for (var i = 0; i < this.playerSpirits.length; i++) {
    this.playerSpirits[i].handleInput();
  }
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
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

  // TODO: position spawning players correctly with the power of Game Logic
  var spiritId = this.addItem(Game4BaseScreen.MenuItem.PLAYER, new Vec2d(Math.random() * 8 - 4, Math.random() * 8 - 4), 0);
  slot.lastSpiritId = spiritId;
  var spirit = this.world.spirits[spiritId];

  spirit.setSlot(slot);
  var r = 1 - 0.5 * Math.random();
  var g = 1 - 0.5 * Math.random();
  var b = 1 - 0.5 * Math.random();
  spirit.setColorRGB(r, g, b);
  this.playerSpirits.push(spirit);

  // splash
  var body = spirit.getBody();
  var pos = spirit.getBodyPos();
  this.sounds.playerSpawn(pos);

  var now = this.now();
  var x = pos.x;
  var y = pos.y;

  var s = new Splash(1, this.stamps.tubeStamp);

  s.startTime = now;
  s.duration = 8;
  var startRad = body.rad * 2;
  var endRad = body.rad * 8;

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
  s.startColor.set(spirit.color);
  s.endColor.set(spirit.color).scale1(0.5);

  this.splasher.addCopy(s);
};

Game4PlayScreen.prototype.playerDrop = function(slot) {
  var playerSpirit = this.world.spirits[slot.lastSpiritId];
  if (playerSpirit) {
    this.killPlayerSpirit(playerSpirit);
  }
  slot.setState(ControlState.WAITING);
};

Game4PlayScreen.prototype.drawScene = function() {
  var startTime = performance.now();

  // update this.circles to match all the player cameras, or the starting area if there are no players now.
  var pad = Game4PlayScreen.PLAYER_VIEW_RADIUS;
  var circles = this.viewCircles;
  var count = 0;
  for (var i = 0; i < this.playerSpirits.length; i++) {
    var spirit = this.playerSpirits[i];
    var cam = spirit.camera;
    var circle = spirit.circle;
    circle.pos.set(cam.cameraPos);
    circle.rad = pad;
    circles[i] = circle;
    count++;
  }
  circles.length = count;
  if (count === 0) {
    this.defaultViewCircle.rad = pad;
    this.viewCircles[0] = this.defaultViewCircle;
  }

  this.positionCamera();
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setCircleMode(this.viewCircles);

  this.drawSpiritsOverlappingCircles(circles);
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTilesOverlappingCircles(circles);

  this.splasher.draw(this.renderer, this.world.now);

  this.renderer.setNormalMode();
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
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
  spiritIdSet.free();
  cellIdSet.free();
};

Game4PlayScreen.prototype.positionCamera = function() {
  if (this.playerSpirits.length === 0) {
    this.viewableWorldRect.setPosXY(0, 0);
  }
  this.viewableWorldRect.rad.reset();
  for (var i = 0; i < this.playerSpirits.length; i++) {
    var spirit = this.playerSpirits[i];
    var playerCamera = spirit.camera;
    if (i === 0) {
      this.viewableWorldRect.setPosXY(playerCamera.getX(), playerCamera.getY());
    } else {
      this.viewableWorldRect.coverXY(playerCamera.getX(), playerCamera.getY());
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
  for (var i = 0; i < this.slots.length; i++) {
    this.slots[i].getControlList().draw(this.renderer);
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
  // TODO: player death effects
  // spirit.explode();
  // this.sounds.playerExplode(spirit.getBodyPos());
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
  return ['respawn', slot.id, slot.lastSpiritId];
};

Game4PlayScreen.prototype.getSlotFromRespawnTimeOutVal = function(timeoutVal) {
  if (!timeoutVal || 'respawn' !== timeoutVal[0]) return null;
  var slotId = timeoutVal[1];
  var lastSpiritId = timeoutVal[2];
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    // make sure there wasn't a new spirit created for this slot since the timeout was created
    if (slot.id === slotId && slot.lastSpiritId === lastSpiritId) {
      return slot;
    }
  }
  return null;
};
