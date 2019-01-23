/**
 * @constructor
 * @extends {Game6BaseScreen}
 */
function Game6PlayScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game6BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.slots = {};
  this.widgets = [];

  let self = this;

  this.keyTipRevealer = function() {
    let ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    // TODO: key tips for mouse and keyboard players?
    // for (let i = 0; i < self.players.length; i++) {
    //   self.players[i].setKeyboardTipTimeoutMs(ms);
    // }
    for (let i = 0; i < self.widgets.length; i++) {
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
Game6PlayScreen.prototype = new Game6BaseScreen();
Game6PlayScreen.prototype.constructor = Game6PlayScreen;

Game6PlayScreen.FRICTION = 0.02;

Game6PlayScreen.TOUCH_STICK_RADIUS = 60;

Game6PlayScreen.EXIT_WARP_MULTIPLIER = 0.1;
Game6PlayScreen.EXIT_DURATION = 30 * Game6PlayScreen.EXIT_WARP_MULTIPLIER;

Game6PlayScreen.PLAYER_VIEW_RADIUS = 24;

Game6PlayScreen.prototype.updateHudLayout = function() {
};

/**
 * @returns {number}
 * @override
 */
Game6PlayScreen.prototype.getClocksPerFrame = function() {
  return 0.5;
};


Game6PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;

  // This iterates through addListener(foo) registered listeners,
  // so test screen's untestWidget listening is taken care of here.
  Game6BaseScreen.prototype.setScreenListening.call(this, listen);

  let buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'),
      buttonEvents, this.fullScreenFn);
  // TODO: resumeButton is ignored in testscreen - this is sloppy
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, document.querySelector('#restartButton'), buttonEvents, this.restartFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game6PlayScreen.prototype.initPauseButtons = function() {
  this.pauseKeyTrigger = new KeyTrigger();
  this.pauseKeyTrigger
      .addTriggerKeyByName(Key.Name.SPACE)
      .addTriggerDownListener(this.pauseDownFn);
  this.addListener(this.pauseKeyTrigger);

  this.pauseTouchWidget = new ClearDoubleTapWidget(this.getHudEventTarget());
  this.pauseTouchWidget
      .addDoubleTapListener(this.pauseDownFn)
      .setStamp(this.stamps.pauseStamp);
  let rule = new CuboidRule(this.canvasCuboid, this.pauseTouchWidget.getWidgetCuboid())
      .setAspectRatio(new Vec4(1, 1))
      .setSourceAnchor(Vec4.ZERO, Vec4.ZERO)
      .setTargetAnchor(Vec4.ZERO, Vec4.ZERO)
      .setSizingMax(new Vec4(0.2, 0.2), new Vec4(50, 50));
  this.cuboidRules.push(rule);

  this.addListener(this.pauseTouchWidget);
};


Game6PlayScreen.prototype.configurePlayerSlots = function() {
  let self = this;

  /////////////
  // KEYBOARD
  /////////////
  function createKeyboardSlot(name, up, right, down, left, action0, drop, menuKey) {
    return new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .addControl(ControlName.JOIN_TRIGGER, new KeyTrigger()
                .addTriggerKeyByName(up)
                .addTriggerKeyByName(right)
                .addTriggerKeyByName(down)
                .addTriggerKeyByName(left)
                .addTriggerKeyByName(action0)
                .addTriggerKeyByName(drop)
                .addTriggerKeyByName(menuKey)
            ))
        .addControlState(ControlState.PLAYING, new ControlMap(ControlMap.USE_EVENT_QUEUE)
            .addControl(ControlName.STICK, new KeyStick()
                .setUpRightDownLeftByName(up, right, down, left))
            .addControl(ControlName.ACTION_0, new KeyTrigger().addTriggerKeyByName(action0))
            .addControl(ControlName.DROP_ITEM, new KeyTrigger().addTriggerKeyByName(drop))
            .addControl(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  //////////
  // TOUCH
  //////////
  function createTouchSlot(name, angle) {
    let buttonAngle = angle + Math.PI / 4;
    let releasedColor = new Vec4(1, 1, 1, 0.8);
    let pressedColor = new Vec4(1, 1, 1, 1.0);
    let matrix = new Matrix44().toRotateZOp(angle);

    function button(stamp) {
      return new TriggerWidget(self.getHudEventTarget())
          .setStamp(stamp)
          .setAngle(buttonAngle - Math.PI / 4)
          .listenToTouch()
          .setPressedColorVec4(pressedColor)
          .setReleasedColorVec4(releasedColor);
    }

    let joinTrigger = button(self.stamps.joinButton);
    let n = Math.sqrt(0.5);
    let rule = new CuboidRule(self.canvasCuboid, joinTrigger.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-n, n).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(0.12, 0.12, 0.99), new Vec4(30, 30));
    self.cuboidRules.push(rule);

    let stick = new TouchStick(self.getWorldEventTarget())
        .setStartZoneFunction(function(x, y) {
          // If this touch is closer to the player's corner than it is to any other
          // active player's corner, then the player can have it.
          // That way inactive waiting-to-join slots don't detract from the other touch players.
          let myCorner = slot.corner;
          let distToMyCorner = Vec2d.distanceSq(
              x, y,
              self.canvas.width * (myCorner.getX() + 1 / 2),
              self.canvas.height * (myCorner.getY() + 1 / 2));
          for (let slotName in self.slots) {
            let otherSlot = self.slots[slotName];
            let otherCorner = otherSlot.corner;
            if (otherCorner && otherCorner !== myCorner && otherSlot.isPlaying()) {
              let otherCornerDist = Vec2d.distanceSq(
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
        .setRadius(Game6PlayScreen.TOUCH_STICK_RADIUS);

    let buttonRad = 50;
    let maxButtonRatio = 1/5;

    let action0Button = button(self.stamps.action0);
    let action0Rule = new CuboidRule(self.canvasCuboid, action0Button.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(action0Rule);

    let dropItemButton = button(self.stamps.dropItem);
    let dropItemRule = new CuboidRule(self.canvasCuboid, dropItemButton.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-3.1, 1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(dropItemRule);

    let menuSizeFactor = 0.6;
    let menuButton = button(self.stamps.menuButton);
    let menuRule = new CuboidRule(dropItemButton.getWidgetCuboid(), menuButton.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1.1, 0.7).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(menuSizeFactor, menuSizeFactor), new Vec4(buttonRad * menuSizeFactor, buttonRad * menuSizeFactor));
    self.cuboidRules.push(menuRule);

    let slot = new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .addControl(ControlName.JOIN_TRIGGER, joinTrigger))
        .addControlState(ControlState.PLAYING, new ControlMap(ControlMap.USE_EVENT_QUEUE)
            .addControl(ControlName.STICK, stick)
            .addControl(ControlName.ACTION_0, action0Button)
            .addControl(ControlName.DROP_ITEM, dropItemButton)
            .addControl(ControlName.MENU, menuButton));
    slot.corner = new Vec4(-1, 1).transform(matrix);
    return slot;
  }

  /////////////////////////
  // POINTER AND KEYBOARD
  /////////////////////////
  function createPointerLockSlot(name, action0Key, dropKey, menuKey) {
    // Join on mouse-click too, since that's a good indication you have a mouse in hand,
    // and it starts the Pointer Lock process.
    return new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .addControl(ControlName.JOIN_TRIGGER,
                new MultiTrigger()
                    .addTrigger(new MouseButtonTrigger())
                    .addTrigger(new MouseButtonTrigger().setListenToLeftButton(false))
                    .addTrigger(new KeyTrigger()
                        .addTriggerKeyByName(action0Key)
                        .addTriggerKeyByName(dropKey)
                        .addTriggerKeyByName(menuKey)
                  )
            )
        )
        .addControlState(ControlState.PLAYING, new ControlMap(ControlMap.USE_EVENT_QUEUE)
            .addControl(ControlName.STICK, new PointerLockStick(self.canvas).setRadius(100))
            .addControl(ControlName.ACTION_0,
                new MultiTrigger()
                    .addTrigger(new MouseButtonTrigger())
                    .addTrigger(new KeyTrigger().addTriggerKeyByName(action0Key))
            )
            .addControl(ControlName.DROP_ITEM,
                new MultiTrigger()
                    .addTrigger(new MouseButtonTrigger().setListenToLeftButton(false))
                    .addTrigger(new KeyTrigger().addTriggerKeyByName(dropKey))
            )
            .addControl(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  let slotList = [
    createKeyboardSlot('k1', Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, 'm', 'n', ','),
    // createKeyboardSlot('k2', 'w', 'd', 's', 'a', 'x', 'z', 'q'),
    createPointerLockSlot('pl', 'x', 'z', 'c'),
    createTouchSlot('t1', 0),
    createTouchSlot('t2', Math.PI / 2),
    createTouchSlot('t3', Math.PI),
    createTouchSlot('t4', 3 * Math.PI / 2)
  ];

  for (let i = 0; i < slotList.length; i++) {
    let slot = slotList[i];
    slot.setState(ControlState.WAITING);
    this.slots[slot.name] = slot;
  }
};

Game6PlayScreen.prototype.setPointerLockAllowed = function(allowed) {
  this.slots['pl'].setPointerLockAllowed(allowed);
};

Game6PlayScreen.prototype.startExit = function(pos) {
  if (this.exitStartTime) return;
  this.sounds.exit(pos);
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game6PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game6PlayScreen.EXIT_WARP_MULTIPLIER);
  this.splashes.addExitSplash(pos.x, pos.y, this.exitStartTime, Game6PlayScreen.EXIT_DURATION);
};

Game6PlayScreen.prototype.exitLevel = function() {
  this.controller.exitLevel(this.createGameState());

  for (let slotName in this.slots) {
    this.slots[slotName].getControlMap().stopListening();
  }
};

Game6PlayScreen.prototype.snapCameraToEntrance = function() {
  for (let spiritId in this.world.spirits) {
    let spirit = this.world.spirits[spiritId];
    if (spirit.type === Game6Key.ENTRANCE) {
      this.entranceSpirit = spirit;
      break;
    }
  }
};

Game6PlayScreen.prototype.handleInput = function () {
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
    let controls = slot.getControlMap();
    if (slot.stateName === ControlState.PLAYING) {
      if (controls.getControl(ControlName.MENU).getVal()) {
        // TODO: Don't make the menu instantly drop players
        this.playerDrop(slot);
      } else {
        let playerSpirit = slot.spirit;
        if (playerSpirit) {
          playerSpirit.handleInput(controls);
        } else {
          if (slot.getDeathFraction(this.now()) <= 0) {
            this.playerSpawn(slot);
          }
        }
      }
      controls.clearEventQueue();
    } else if (slot.stateName === ControlState.WAITING) {
      if (controls.getControl(ControlName.JOIN_TRIGGER).getVal()) {
        this.playerJoin(slot);
      }
    }
  }
};

Game6PlayScreen.prototype.playerJoin = function(slot) {
  if (slot.getDeathFraction(this.now()) <= 0) {
    slot.setState(ControlState.PLAYING);
    this.playerSpawn(slot);
  }
};

Game6PlayScreen.prototype.playerSpawn = function(slot) {
  slot.releaseControls();
  slot.setRespawnPos(new Vec2d()); // TODO no!

  let pos = new Vec2d(0, 0.5).rot(Math.PI * 2 * Math.random());
  let spiritId = PlayerSpirit.factory(this, pos, 0);
  let spirit = this.world.spirits[spiritId];

  slot.setSpirit(spirit);
  let r = 0.8 - 0.5 * Math.random();
  let g = 0.8 - 0.2 * Math.random();
  let b = 0.2 + 0.6 * Math.random();
  spirit.setColorRGB(r, g, b);

  let body = spirit.getBody();
  this.sounds.playerSpawn(pos);
  this.splashes.addPlayerSpawnSplash(this.now(), pos, body.rad, spirit.color);
};

Game6PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  let slot = this.getSlotForPlayerSpirit(spirit);
  slot.killPlayerAtTime(this.now());
};

Game6PlayScreen.prototype.getSlotForPlayerSpirit = function(spirit) {
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
    if (slot.spirit === spirit) {
      return slot;
    }
  }
  return null;
};

Game6PlayScreen.prototype.playerDrop = function(slot) {
  slot.setRespawnPos(slot.camera.cameraPos);
  slot.killPlayerAtTime(this.now());
  slot.setState(ControlState.WAITING);
};

Game6PlayScreen.prototype.onHitEvent = function(e) {
  if (e.time !== this.now()) {
    console.error('onHitEvent e.time !== this.now()', e.time, this.now());
  }
  let b0 = this.world.getBodyByPathId(e.pathId0);
  let b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game6PlayScreen.prototype.drawScene = function() {
  this.processDistGrid();
  this.updateViewCircles();
  this.positionCamera();
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setTime(this.now());

  this.drawTiles();
  this.drawSpirits(); // TODO: Make a better spirit drawer that only draws stuff that's on the screen.

  this.splasher.drawWithModelIds(this, this.world.now);
  this.flushBatchDrawers();

  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game6PlayScreen.prototype.updateViewCircles = function() {
  // update this.viewCircles to match all the player cameras,
  // or the starting area if there are no players now.
  let count = 0;
  let now = this.now();
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
    if (slot.updateViewCircle(now)) {
      count++;
    }
  }
};

Game6PlayScreen.prototype.distOutsideVisibleWorld = function(pos) {
  return this.viewableWorldRect.distanceToVec(pos);
};

Game6PlayScreen.prototype.positionCamera = function() {
  this.viewableWorldRect.rad.reset();
  let players = 0;

  for (let name in this.slots) {
    let slot = this.slots[name];
    if (slot.isPlaying() || slot.getDeathFraction(this.now())) {
      players++;
      let cam = slot.camera;
      if (players === 1) {
        this.viewableWorldRect.setPosXY(cam.getX(), cam.getY());
      } else {
        this.viewableWorldRect.coverXY(cam.getX(), cam.getY());
      }
    }
  }

  if (players === 0) {
    this.viewableWorldRect.setPos(Vec2d.ZERO); // TODO: noperoo!
  }

  let pad = Game6PlayScreen.PLAYER_VIEW_RADIUS;
  this.viewableWorldRect.padXY(pad, pad);
  let playerAspectRatio = this.viewableWorldRect.getAspectRatio();
  let canvasAspectRatio = this.canvas.width / this.canvas.height;
  if (playerAspectRatio < canvasAspectRatio) {
    let newViewableWidth = this.canvas.width * this.viewableWorldRect.getHeight() / this.canvas.height;
    this.viewableWorldRect.rad.x = 0.5 * newViewableWidth;
  } else {
    let newViewableHeight = this.canvas.height * this.viewableWorldRect.getWidth() / this.canvas.width;
    this.viewableWorldRect.rad.y = 0.5 * newViewableHeight;
  }

  this.pixelsPerMeter = Math.min(
      2 * this.canvas.width / this.viewableWorldRect.getWidth(),
      2 * this.canvas.height / this.viewableWorldRect.getHeight());

  // gently update the camera position
  this.camera.follow(this.viewableWorldRect.pos);
};

Game6PlayScreen.prototype.getPixelsPerMeter = function() {
  return this.pixelsPerMeter;
};

Game6PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  for (let slotName in this.slots) {
    this.slots[slotName].getControlMap().draw(this.renderer);
  }
  for (let i = 0; i < this.widgets.length; i++) {
    this.widgets[i].draw(this.renderer);
  }
  this.pauseTouchWidget.draw(this.renderer);
  this.renderer.setBlendingEnabled(false);
};

Game6PlayScreen.prototype.isPlaying = function() {
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
Game6PlayScreen.prototype.createGameState = function() {
  let players = [];
  for (let name in this.slots) {
    let slot = this.slots[name];
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

Game6PlayScreen.prototype.restoreGameState = function(state) {
  if (!state) {
    return;
  }
  let players = state.players;
  for (let i = 0; i < players.length; i++) {
    let player = players[i];
    this.playerJoin(this.slots[player.slotName]);
  }
};
