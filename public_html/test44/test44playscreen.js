/**
 * @constructor
 * @extends {Test44BaseScreen}
 */
function Test44PlayScreen(controller, canvas, renderer, stamps, sfx) {
  Test44BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0, 0, 25);
  this.viewableWorldRect = new Rect();
  this.pixelsPerMeter = 100;
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  this.playerSpirits = [];
  this.circles = [];
  this.startingCircle = new Circle();

  this.bitSize = 0.5;
  this.levelColorVector = new Vec4(0.8, 0.8, 0.8);

  this.initPauseButtons();
}
Test44PlayScreen.prototype = new Test44BaseScreen();
Test44PlayScreen.prototype.constructor = Test44PlayScreen;

Test44PlayScreen.ANT_RAD = 1.2;

Test44PlayScreen.RESPAWN_TIMEOUT = 30;
Test44PlayScreen.PLAYER_VIEW_RADIUS = 30;

Test44PlayScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  for (var i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }
};

Test44PlayScreen.prototype.getCamera = function() {
  return this.camera;
};

Test44PlayScreen.prototype.initPauseButtons = function() {
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
      .setAspectRatio(new Vec4(1, 1), Vec4.ZERO)
      .setSourceAnchor(Vec4.ZERO, Vec4.ZERO)
      .setTargetAnchor(Vec4.ZERO, Vec4.ZERO)
      .setSizingMax(new Vec4(0.2, 0.2), new Vec4(50, 50));
  this.cuboidRules.push(rule);

  this.addListener(this.pauseTouchWidget);
};


Test44PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  Test44BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.keyTipRevealer);
    window.addEventListener('keydown', this.keyTipRevealer);

  } else {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.keyTipRevealer);
    window.removeEventListener('keydown', this.keyTipRevealer);
  }
  this.listening = listen;
};

Test44PlayScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 18, 1);
  var pos = new Vec2d();
  var pos2 = new Vec2d();
  var rooms = 10;
  for (var r = 0; r < rooms; r++) {
    var rad = 4 + Math.random() * 10;
    pos.setXY(0, rad + 20 + 40 * Math.random()).rot(2 * Math.PI * (r / rooms)).rot(0.3 * (Math.random() - 0.5));
    this.tileGrid.drawTerrainPill(pos, pos2.reset().addXY(0, (rad + Math.random() * rad * 3)).rot(Math.random() * Math.PI * 2).add(pos), rad, 1);
    this.tileGrid.drawTerrainPill(pos, Vec2d.ZERO, 2, 1);
    if (Math.random() > 0.4) this.tileGrid.drawTerrainPill(pos, pos, 1 + Math.random() * (rad - 4), 0);
  }
  rooms = 10;
  for (var r = 0; r < rooms; r++) {
    var rad = 6 + Math.random() * 10;
    pos.setXY(0, rad + 20 + 5 * Math.random()).rot(2 * Math.PI * (r / rooms)).rot(0.1 * (Math.random() - 0.5));
    this.tileGrid.drawTerrainPill(pos, pos, rad, 1);
    this.tileGrid.drawTerrainPill(pos, Vec2d.ZERO, 3, 1);
    if (Math.random() > 0.2) this.tileGrid.drawTerrainPill(pos, pos, 1 + Math.random() * (rad - 5), 0);
  }
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 10;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test44BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }

  this.configurePlayerSlots();
};

Test44PlayScreen.prototype.configurePlayerSlots = function() {
  var self = this;
  function createKeyboardSlot(up, right, down, left, speed, b1, b2, menuKey) {
    return new PlayerSlot()
        .add(ControlState.WAITING, new ControlMap()
            .add(ControlName.JOIN_TRIGGER, new KeyTrigger()
                .addTriggerKeyByName(up)
                .addTriggerKeyByName(right)
                .addTriggerKeyByName(down)
                .addTriggerKeyByName(left)
                .addTriggerKeyByName(speed)
                .addTriggerKeyByName(b1)
                .addTriggerKeyByName(b2)
                .addTriggerKeyByName(menuKey)
            ))
        .add(ControlState.PLAYING, new ControlMap()
            .add(ControlName.STICK, new TwoSpeedKeyStick()
                .setUpRightDownLeftByName(up, right, down, left)
                .setSpeedTrigger(new KeyTrigger().addTriggerKeyByName(speed))
                .setDefaultMultiplier(1/2)
                .setSpeedTwoMultiplier(1))
            .add(ControlName.BUTTON_1, new KeyTrigger().addTriggerKeyByName(b1))
            .add(ControlName.BUTTON_2, new KeyTrigger().addTriggerKeyByName(b2))
            .add(ControlName.MENU, new KeyTrigger().addTriggerKeyByName(menuKey))
        );
        // .add(PlayerSpirit.STATE_MENU, new ControlMap()
        //     .add('clickPad', new KeyClickPad().setUpRightDownLeftByName(up, right, down, left)));
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
                  x, y, self.canvas.width * (otherCorner.getX() + 1 / 2), self.canvas.height * (otherCorner.getY() + 1 / 2));
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
            .add(ControlName.STICK, new PointerLockStick(self.canvas).setRadius(200))
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
    createKeyboardSlot(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, 'm', ',', '.', 'l'),
    createKeyboardSlot('w', 'd', 's', 'a', Key.Name.SHIFT, 'z', 'x', 'q'),
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

Test44PlayScreen.prototype.playerJoin = function(slot) {
  slot.setState(ControlState.PLAYING);
  this.playerSpawn(slot);
};

Test44PlayScreen.prototype.playerSpawn = function(slot) {
  slot.releaseControls();
  var spiritId = this.addItem(Test44BaseScreen.MenuItem.PLAYER, new Vec2d(Math.random() * 8 - 4, Math.random() * 8 - 4), 0);
  slot.lastSpiritId = spiritId;
  var spirit = this.world.spirits[spiritId];
  spirit.setSlot(slot);
  var r = 1.1 - 0.6 * Math.random();
  var g = 1 - 0.8 * Math.random();
  var b = 1 - 0.9 * Math.random();
  spirit.setColorRGB(r, g, b);
  this.playerSpirits.push(spirit);

  // splash
  var body = this.getBodyById(spirit.bodyId);
  var pos = spirit.getBodyPos();
  this.sounds.playerSpawn(pos);

  var now = this.now();
  var x = pos.x;
  var y = pos.y;

  var s = new Splash(1, this.stamps.tubeStamp);

  s.startTime = now;
  s.duration = 10;
  var startRad = body.rad * 2;
  var endRad = body.rad * 8;

  s.startPose.pos.setXYZ(x, y, 1);
  s.endPose.pos.setXYZ(x, y, 1);
  s.startPose.scale.setXYZ(0, 0, 1);
  s.endPose.scale.setXYZ(endRad, endRad, 1);

  s.startPose2.pos.setXYZ(x, y, 1);
  s.endPose2.pos.setXYZ(x, y, 1);
  s.startPose2.scale.setXYZ(startRad, startRad, 1);
  s.endPose2.scale.setXYZ(endRad, endRad, 1);

  s.startPose.rotZ = 0;
  s.endPose.rotZ = 0;
  s.startColor.setXYZ(r*2, g*2, b*2);
  s.endColor.setXYZ(0, 0, 0);

  this.splasher.addCopy(s);
};

Test44PlayScreen.prototype.playerDrop = function(slot) {
  var playerSpirit = this.world.spirits[slot.lastSpiritId];
  if (playerSpirit) {
    this.killPlayerSpirit(playerSpirit);
  }
  slot.setState(ControlState.WAITING);
};


Test44PlayScreen.prototype.handleInput = function () {
  for (var i = 0; i < this.playerSpirits.length; i++) {
    this.playerSpirits[i].handleInput();
  }
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    var controls = slot.getControlList();
    if (slot.stateName == ControlState.PLAYING) {
      if (controls.get(ControlName.MENU).getVal()) {
        this.playerDrop(slot);
      }
    } else if (slot.stateName == ControlState.WAITING) {
      if (controls.get(ControlName.JOIN_TRIGGER).getVal()) {
        this.playerJoin(slot);
      }
    }
  }
};

Test44PlayScreen.prototype.drawScene = function() {
  var startTime = performance.now();

  // update this.circles to match all the player cameras, or the starting area if there are no players now.
  var pad = Test44PlayScreen.PLAYER_VIEW_RADIUS;
  var circles = this.circles;
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
  if (count == 0) {
    this.startingCircle.rad = pad;
    this.circles[0] = this.startingCircle;
  }

  this.positionCamera();
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);
  this.renderer.setCircleMode(this.circles);

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

Test44PlayScreen.prototype.drawSpiritsOverlappingCircles = function(circles) {
  var cellIdSet = ObjSet.alloc();
  var spiritIdSet = ObjSet.alloc();
  var i;
  for (i = 0; i < circles.length; i++) {
    this.world.addCellIdsOverlappingCircle(cellIdSet, circles[i]);
  }
  for (var cellId in cellIdSet.vals) {
    for (var groupNum = 0; groupNum < this.world.getGroupCount(); groupNum++) {
      if (groupNum == this.getWallHitGroup()) continue;
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

Test44PlayScreen.prototype.positionCamera = function() {
  if (this.playerSpirits.length == 0) {
    this.viewableWorldRect.setPosXY(0, 0);
  }
  this.viewableWorldRect.rad.reset();
  for (var i = 0; i < this.playerSpirits.length; i++) {
    var spirit = this.playerSpirits[i];
    var playerCamera = spirit.camera;
    if (i == 0) {
      this.viewableWorldRect.setPosXY(playerCamera.getX(), playerCamera.getY());
    } else {
      this.viewableWorldRect.coverXY(playerCamera.getX(), playerCamera.getY());
    }
  }
  var pad = Test44PlayScreen.PLAYER_VIEW_RADIUS * 0.7;
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

Test44PlayScreen.prototype.getPixelsPerMeter = function() {
  return this.pixelsPerMeter;
};

Test44PlayScreen.prototype.drawHud = function() {
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
  this.pauseTouchWidget.draw(this.renderer);
  this.renderer.setBlendingEnabled(false);
};

Test44PlayScreen.prototype.isPlaying = function() {
  return true;
};

Test44PlayScreen.prototype.onHitEvent = function(e) {
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);
    this.sounds.wallThump(pos, mag);

    var s0 = this.getSpiritForBody(b0);
    var s1 = this.getSpiritForBody(b1);
    if (s0 && s1) {
      this.pair[0] = s0;
      this.pair[1] = s1;
      // this.checkPlayerAntHit(this.pair);
    }
  }
};

Test44PlayScreen.prototype.onTimeout = function(e) {
  var slot = this.getSlotFromRespawnTimeOutVal(e.timeoutVal);
  if (slot && slot.stateName != ControlState.WAITING) {
    this.playerSpawn(slot);
  }
};

Test44PlayScreen.prototype.checkPlayerAntHit = function(pair) {
  if (this.getSpiritPairMatchingTypes(pair, Test44BaseScreen.SpiritType.PLAYER, Test44BaseScreen.SpiritType.ANT)) {
    var playerSpirit = pair[0];
    this.killPlayerSpirit(playerSpirit);
    this.schedulePlayerRespawn(playerSpirit.slot);
  }
};

Test44PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  var slot = spirit.slot;
  spirit.explode();
  this.sounds.playerExplode(spirit.getBodyPos());
  this.removeByBodyId(spirit.bodyId);
  for (var i = 0; i < this.playerSpirits.length; i++) {
    if (this.playerSpirits[i] == spirit) {
      this.playerSpirits[i] = this.playerSpirits[this.playerSpirits.length - 1];
      this.playerSpirits.pop();
      break;
    }
  }
};

Test44PlayScreen.prototype.schedulePlayerRespawn = function(slot) {
  this.world.addTimeout(this.now() + Test44PlayScreen.RESPAWN_TIMEOUT, null, this.getRespawnTimeoutValForSlot(slot));
};

Test44PlayScreen.prototype.getRespawnTimeoutValForSlot = function(slot) {
  return ['respawn', slot.id, slot.lastSpiritId];
};

Test44PlayScreen.prototype.getSlotFromRespawnTimeOutVal = function(timeoutVal) {
  if (!timeoutVal || 'respawn' != timeoutVal[0]) return null;
  var slotId = timeoutVal[1];
  var lastSpiritId = timeoutVal[2];
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    // make sure there wasn't a new spirit created for this slot since the timeout was created
    if (slot.id == slotId && slot.lastSpiritId == lastSpiritId) {
      return slot;
    }
  }
  return null;
};
