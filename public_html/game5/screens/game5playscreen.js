/**
 * @constructor
 * @extends {Game5BaseScreen}
 */
function Game5PlayScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  // Is this being used as a prototype?
  if (!controller) return;

  Game5BaseScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.updateViewMatrix();

  this.slots = {};
  this.widgets = [];

  this.viewCircles = [];

  this.defaultViewCircle = new Circle();
  this.defaultViewCircle.rad =
      Game5PlayScreen.PLAYER_VIEW_RADIUS
      * Game5PlayScreen.STARTING_VIEW_FRACTION;

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
Game5PlayScreen.prototype = new Game5BaseScreen();
Game5PlayScreen.prototype.constructor = Game5PlayScreen;

Game5PlayScreen.FRICTION = 0.02;

Game5PlayScreen.TOUCH_STICK_RADIUS = 60;

Game5PlayScreen.EXIT_WARP_MULTIPLIER = 0.001;
Game5PlayScreen.EXIT_DURATION = 30 * Game5PlayScreen.EXIT_WARP_MULTIPLIER;

Game5PlayScreen.PLAYER_VIEW_RADIUS = 36;
Game5PlayScreen.STARTING_VIEW_FRACTION = 0.5;
Game5PlayScreen.PLAYER_VIEW_MIN_VISIBLE_FRAC = 0.6;

Game5PlayScreen.prototype.updateHudLayout = function() {
};

/**
 * @returns {number}
 * @override
 */
Game5PlayScreen.prototype.getClocksPerFrame = function() {
  return 0.5;
};


Game5PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen === this.listening) return;

  // This iterates through addListener(foo) registered listeners,
  // so test screen's untestWidget listening is taken care of here.
  Game5BaseScreen.prototype.setScreenListening.call(this, listen);

  let buttonEvents = ['click', 'touchEnd'];
  Events.setListening(listen, document.querySelector('#fullScreenButton'),
      buttonEvents, this.fullScreenFn);
  // TODO: resumeButton is ignored in testscreen - this is sloppy
  Events.setListening(listen, document.querySelector('#resumeButton'), buttonEvents, this.pauseDownFn);
  Events.setListening(listen, document.querySelector('#restartButton'), buttonEvents, this.restartFn);
  Events.setListening(listen, this.canvas, 'mousemove', this.keyTipRevealer);
  Events.setListening(listen, window, 'keydown', this.keyTipRevealer);
};

Game5PlayScreen.prototype.initPauseButtons = function() {
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


Game5PlayScreen.prototype.configurePlayerSlots = function() {
  let self = this;

  /////////////
  // KEYBOARD
  /////////////
  function createKeyboardSlot(name, up, right, down, left, action0, action1, drop, equip, menuKey) {
    return new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new KeyTrigger()
                .addTriggerKeyByName(up)
                .addTriggerKeyByName(right)
                .addTriggerKeyByName(down)
                .addTriggerKeyByName(left)
                .addTriggerKeyByName(action0)
                .addTriggerKeyByName(action1)
                .addTriggerKeyByName(drop)
                .addTriggerKeyByName(equip)
                .addTriggerKeyByName(menuKey)
            ))
        .addControlState(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new KeyStick()
                .setUpRightDownLeftByName(up, right, down, left))
            .add(ControlName.ACTION_0, new KeyTrigger().addTriggerKeyByName(action0))
            .add(ControlName.ACTION_1, new KeyTrigger().addTriggerKeyByName(action1))
            .add(ControlName.DROP_ITEM, new KeyTrigger().addTriggerKeyByName(drop))
            .add(ControlName.EQUIP_ITEM, new KeyTrigger().addTriggerKeyByName(equip))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
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
        .setRadius(Game5PlayScreen.TOUCH_STICK_RADIUS);

    let buttonRad = 50;
    let maxButtonRatio = 1/5;

    let action0Button = button(self.stamps.action0);
    let action0Rule = new CuboidRule(self.canvasCuboid, action0Button.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(action0Rule);

    let action1Button = button(self.stamps.action1);
    let action1Rule = new CuboidRule(self.canvasCuboid, action1Button.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1, 3.1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(action1Rule);

    let dropItemButton = button(self.stamps.dropItem);
    let dropItemRule = new CuboidRule(self.canvasCuboid, dropItemButton.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-3.1, 3.1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(dropItemRule);

    let equipItemButton = button(self.stamps.equipItem);
    let equipItemRule = new CuboidRule(self.canvasCuboid, equipItemButton.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(-1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-3.1, 1).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(maxButtonRatio, maxButtonRatio), new Vec4(buttonRad, buttonRad));
    self.cuboidRules.push(equipItemRule);

    let menuSizeFactor = 0.6;
    let menuButton = button(self.stamps.menuButton);
    let menuRule = new CuboidRule(equipItemButton.getWidgetCuboid(), menuButton.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1))
        .setSourceAnchor(new Vec4(1, 1).transform(matrix), Vec4.ZERO)
        .setTargetAnchor(new Vec4(-1.1, 0.7).transform(matrix), Vec4.ZERO)
        .setSizingMax(new Vec4(menuSizeFactor, menuSizeFactor), new Vec4(buttonRad * menuSizeFactor, buttonRad * menuSizeFactor));
    self.cuboidRules.push(menuRule);

    let slot = new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, joinTrigger))
        .addControlState(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, stick)
            .add(ControlName.ACTION_0, action0Button)
            .add(ControlName.ACTION_1, action1Button)
            .add(ControlName.DROP_ITEM, dropItemButton)
            .add(ControlName.EQUIP_ITEM, equipItemButton)
            .add(ControlName.MENU, menuButton));
    slot.corner = new Vec4(-1, 1).transform(matrix);
    return slot;
  }

  /////////////////////////
  // POINTER AND KEYBOARD
  /////////////////////////
  function createPointerLockSlot(name, action0Key, action1Key, dropKey, equipKey, menuKey) {
    // Only join on mouse-click, since that's a good indication you have a mouse in hand,
    // and it starts the Pointer Lock process.
    return new PlayerSlot(name)
        .addControlState(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger()
                    .addTriggerKeyByName(action0Key)
                    .addTriggerKeyByName(action1Key)
                    .addTriggerKeyByName(dropKey)
                    .addTriggerKeyByName(equipKey)
                    .addTriggerKeyByName(menuKey)
                )))
        .addControlState(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new PointerLockStick(self.canvas).setRadius(100))
            .add(ControlName.ACTION_0, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(action0Key)))
            .add(ControlName.ACTION_1, new MultiTrigger()
                .addTrigger(new MouseButtonTrigger(self.canvas).setListenToLeftButton(false))
                .addTrigger(new KeyTrigger().addTriggerKeyByName(action1Key)))
            .add(ControlName.DROP_ITEM, new KeyTrigger().addTriggerKeyByName(dropKey))
            .add(ControlName.EQUIP_ITEM, new KeyTrigger().addTriggerKeyByName(equipKey))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
  }

  let slotList = [
    createKeyboardSlot('k1', Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, 'm', 'n', '.', ',', 'l'),
    createKeyboardSlot('k2', 'w', 'd', 's', 'a', 'z', Key.Name.SHIFT, 'c', 'x', '1'),
    createPointerLockSlot('pl', 'b', 'v', 'h', 'g', 'y'),
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

Game5PlayScreen.prototype.setPointerLockAllowed = function(allowed) {
  this.slots['pl'].setPointerLockAllowed(allowed);
};

Game5PlayScreen.prototype.startExit = function(pos) {
  if (this.exitStartTime) return;
  this.sounds.exit(pos);
  this.exitStartTime = this.now();
  this.exitEndTime = this.exitStartTime + Game5PlayScreen.EXIT_DURATION;
  this.setTimeWarp(Game5PlayScreen.EXIT_WARP_MULTIPLIER);
  this.splashes.addExitSplash(pos.x, pos.y, this.exitStartTime, Game5PlayScreen.EXIT_DURATION);
};

Game5PlayScreen.prototype.exitLevel = function() {
  this.controller.exitLevel(this.createGameState());
};

Game5PlayScreen.prototype.snapCameraToEntrance = function() {
  for (let spiritId in this.world.spirits) {
    let spirit = this.world.spirits[spiritId];
    if (spirit.type === Game5Key.ENTRANCE) {
      this.entranceSpirit = spirit;
      break;
    }
  }
  if (this.entranceSpirit) {
    this.defaultViewCircle.pos.set(this.entranceSpirit.getBodyPos());
  }
  let pos = this.defaultViewCircle.pos;
  if (pos) {
    this.camera.set(pos);
  }
};

Game5PlayScreen.prototype.handleInput = function () {
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
    let controls = slot.getControlList();
    if (slot.stateName === ControlState.PLAYING) {
      if (controls.get(ControlName.MENU).getVal()) {
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
    } else if (slot.stateName === ControlState.WAITING) {
      if (controls.get(ControlName.JOIN_TRIGGER).getVal()) {
        this.playerJoin(slot);
      }
    }
  }
};

Game5PlayScreen.prototype.playerJoin = function(slot) {
  if (slot.getDeathFraction(this.now()) <= 0) {
    slot.setState(ControlState.PLAYING);
    this.playerSpawn(slot);
  }
};

Game5PlayScreen.prototype.playerSpawn = function(slot) {
  slot.releaseControls();
  slot.setRespawnPos(this.defaultViewCircle.pos);

  let pos = new Vec2d(0, 0.5).rot(Math.PI * 2 * Math.random()).add(this.defaultViewCircle.pos);
  let spiritId = PlayerSpirit.factory(this, pos, 0);
  let spirit = this.world.spirits[spiritId];

  slot.setSpirit(spirit);
  let r = 1 - 0.5 * Math.random();
  let g = 1 - 0.5 * Math.random();
  let b = 1 - 0.5 * Math.random();
  spirit.setColorRGB(r, g, b);

  let body = spirit.getBody();
  this.sounds.playerSpawn(pos);
  this.splashes.addPlayerSpawnSplash(this.now(), pos, body.rad, spirit.color);
};

Game5PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  let slot = this.getSlotForPlayerSpirit(spirit);
  slot.killPlayerAtTime(this.now());
};

Game5PlayScreen.prototype.getSlotForPlayerSpirit = function(spirit) {
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
    if (slot.spirit === spirit) {
      return slot;
    }
  }
  return null;
};

Game5PlayScreen.prototype.playerDrop = function(slot) {
  slot.setRespawnPos(slot.camera.cameraPos);
  slot.killPlayerAtTime(this.now());
  slot.setState(ControlState.WAITING);
  this.defaultViewCircle.rad = 0.01;
};

Game5PlayScreen.prototype.onHitEvent = function(e) {
  if (e.time !== this.now()) {
    console.error('onHitEvent e.time !== this.now()', e.time, this.now());
  }
  let b0 = this.world.getBodyByPathId(e.pathId0);
  let b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game5PlayScreen.prototype.distOutsideViewCircles = function(v) {
  let min = Infinity;
  for (let i = 0; i < this.viewCircles.length; i++) {
    let c = this.viewCircles[i];
    // let ds = Math.max(0, c.pos.distance(v) - c.rad);
    let ds = c.pos.distance(v) - c.rad;
    if (ds < min) min = ds;
  }
  return min;
};

Game5PlayScreen.prototype.distFromViewCenter = function(v) {
  let min = Infinity;
  for (let i = 0; i < this.viewCircles.length; i++) {
    let c = this.viewCircles[i];
    let ds = c.pos.distance(v);
    if (ds < min) min = ds;
  }
  return min;
};

Game5PlayScreen.prototype.drawScene = function() {
  this.updateViewCircles();
  this.positionCamera();
  this.updateViewMatrix();
  // this.updateWarps();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setTime(this.now());

  this.renderer.setCircleMode(this.viewCircles);
  this.drawTilesOverlappingCircles(this.viewCircles);
  this.drawSpiritsOverlappingCircles(this.viewCircles);

  this.splasher.drawWithModelIds(this, this.world.now);
  this.flushBatchDrawers();

  this.renderer.setNormalMode();
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game5PlayScreen.prototype.updateViewCircles = function() {
  // update this.viewCircles to match all the player cameras,
  // or the starting area if there are no players now.
  let count = 0;
  let now = this.now();
  for (let slotName in this.slots) {
    let slot = this.slots[slotName];
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
        0.03 * Game5PlayScreen.PLAYER_VIEW_RADIUS
          * Game5PlayScreen.STARTING_VIEW_FRACTION;
    this.viewCircles[0] = this.defaultViewCircle;
  } else {
    this.viewCircles.length = count;
  }
};

Game5PlayScreen.prototype.positionCamera = function() {
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
    this.viewableWorldRect.setPos(this.defaultViewCircle.pos);
  }

  let pad = Game5PlayScreen.PLAYER_VIEW_RADIUS * Game5PlayScreen.PLAYER_VIEW_MIN_VISIBLE_FRAC;
  this.viewableWorldRect.padXY(pad, pad);

  let destPixelsPerMeter = Math.min(
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

Game5PlayScreen.prototype.getPixelsPerMeter = function() {
  return this.pixelsPerMeter;
};

Game5PlayScreen.prototype.drawHud = function() {
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
    this.slots[slotName].getControlList().draw(this.renderer);
  }
  for (let i = 0; i < this.widgets.length; i++) {
    this.widgets[i].draw(this.renderer);
  }
  this.pauseTouchWidget.draw(this.renderer);
  this.renderer.setBlendingEnabled(false);
};
Game5PlayScreen.prototype.isPlaying = function() {
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
Game5PlayScreen.prototype.createGameState = function() {
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

Game5PlayScreen.prototype.restoreGameState = function(state) {
  if (!state) {
    return;
  }
  let players = state.players;
  for (let i = 0; i < players.length; i++) {
    let player = players[i];
    this.playerJoin(this.slots[player.slotName]);
  }
};