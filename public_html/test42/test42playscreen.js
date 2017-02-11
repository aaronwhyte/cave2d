/**
 * @constructor
 * @extends {Test42BaseScreen}
 */
function Test42PlayScreen(controller, canvas, renderer, stamps, sfx) {
  Test42BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, 25);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  this.playerSpirits = [];
  this.touchButtons = [];
}
Test42PlayScreen.prototype = new Test42BaseScreen();
Test42PlayScreen.prototype.constructor = Test42PlayScreen;

Test42PlayScreen.ANT_RAD = 1.2;

Test42PlayScreen.MAX_UNDO_DEPTH = 20000;

Test42PlayScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
  for (var i = 0; i < this.cuboidRules.length; i++) {
    this.cuboidRules[i].apply();
  }
};

Test42PlayScreen.prototype.getCamera = function() {
  return this.camera;
};

Test42PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  Test42BaseScreen.prototype.setScreenListening.call(this, listen);
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

Test42PlayScreen.prototype.createDefaultWorld = function() {
  this.world.setChangeRecordingEnabled(true);
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 20, 1);
  var ants = 7;
  for (var a = 0; a < ants; a++) {
    this.addItem(Test42BaseScreen.MenuItem.ANT, new Vec2d(0, 15).rot(2 * Math.PI * a / ants), 2 * Math.PI * a / ants);
  }

  this.configurePlayerSlots();
};

Test42PlayScreen.prototype.configurePlayerSlots = function() {
  var self = this;
  function createKeyboardSlot(up, right, down, left, b1, b2, menu) {
    return new PlayerSlot(
        new KeyTrigger()
            .addTriggerKeyByName(up)
            .addTriggerKeyByName(right)
            .addTriggerKeyByName(down)
            .addTriggerKeyByName(left)
            .addTriggerKeyByName(b1)
            .addTriggerKeyByName(b2)
            .addTriggerKeyByName(menu),
        new PlayerControls(
            new KeyStick().setUpRightDownLeftByName(up, right, down, left),
            new KeyTrigger().addTriggerKeyByName(b1),
            new KeyTrigger().addTriggerKeyByName(b2),
            new KeyTrigger().addTriggerKeyByName(menu)
        )
    );
  }

  function createTouchSlot(xFrac, yFrac) {
    var joinTrigger = new TriggerWidget(self.canvas);
    joinTrigger
        .setStamp(self.stamps.circleStamp)
        .listenToTouch()
        .setReleasedColorVec4(new Vec4(1, 1, 1, 0.25));
    var n = Math.sqrt(0.5);
    var rule = new CuboidRule(self.canvasCuboid, joinTrigger.getWidgetCuboid())
        .setAspectRatio(new Vec4(1, 1), Vec4.ZERO)
        .setSourceAnchor(new Vec4(xFrac ? 1 : -1, yFrac ? 1 : -1), Vec4.ZERO)
        .setTargetAnchor(new Vec4(xFrac ? n : -n, yFrac ? n : -n), Vec4.ZERO)
        .setSizingMax(new Vec4(0.2, 0.2, 0.99), new Vec4(30, 30));
    self.cuboidRules.push(rule);
    self.touchButtons.push(joinTrigger);

    var stick = new TouchStick();
    stick.setRadius(16);
    stick.setStartZoneFunction(function(x, y) {
      return Math.abs(x / self.canvas.width - xFrac) < 0.5 && Math.abs(y / self.canvas.height - yFrac) < 0.5;
    });
    return new PlayerSlot(
        joinTrigger,
        new PlayerControls(stick, null, null, null)
    );
  }

  this.slots = [
    createKeyboardSlot(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, ',', '.', '/'),
    createKeyboardSlot('w', 'd', 's', 'a', 'z', 'x', 'q'),
    createTouchSlot(0, 0),
    createTouchSlot(1, 0),
    createTouchSlot(0, 1),
    createTouchSlot(1, 1)
  ];

  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    slot.enable();
    slot.joinTrigger.addTriggerUpListener(this.createJoinFn(slot));
  }
};

Test42PlayScreen.prototype.createJoinFn = function(slot) {
  var self = this;
  return function() {
    var spiritId = self.addItem(Test42BaseScreen.MenuItem.PLAYER, new Vec2d(Math.random() * 8 - 4, Math.random() * 8 - 4), 0);
    var spirit = self.world.spirits[spiritId];
    spirit.setControls(slot.playerControls);
    var r = Math.random();
    var g = Math.random();
    var b = 1 - (r + g)/3;
    spirit.setColorRGB(r, g, b);
    self.playerSpirits.push(spirit);
    slot.join();

    // splash
    var body = self.getBodyById(spirit.bodyId);
    var pos = spirit.getBodyPos();
    // self.sounds.playerSpawn(pos);

    var now = self.now();
    var x = pos.x;
    var y = pos.y;

    var s = new Splash(1, self.stamps.tubeStamp);

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

    self.splasher.addCopy(s);
  };
};

Test42PlayScreen.prototype.handleInput = function () {
  for (var i = 0; i < this.playerSpirits.length; i++) {
    this.playerSpirits[i].handleInput();
  }
};

Test42PlayScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  var startTime = performance.now();
  this.drawSpirits();
  stats.add(STAT_NAMES.DRAW_SPIRITS_MS, performance.now() - startTime);

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Test42PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
          2 / this.canvas.width,
          -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  for (var i = 0; i < this.touchButtons.length; i++) {
    var b = this.touchButtons[i];
    if (b.isListening()) {
      b.draw(this.renderer);
    }
  }
  this.renderer.setBlendingEnabled(false);
};

Test42PlayScreen.prototype.isPlaying = function() {
  return true;
};

Test42PlayScreen.prototype.onHitEvent = function(e) {
  if (!this.isPlaying()) return;

  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);

  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
    var vec = Vec2d.alloc();
    var mag = vec.set(b1.vel).subtract(b0.vel).projectOnto(e.collisionVec).magnitude();
    var pos = this.resolver.getHitPos(e.time, e.collisionVec, b0, b1, vec);

    var s0 = this.getSpiritForBody(b0);
    var s1 = this.getSpiritForBody(b1);
    if (s0 && s1) {
      this.pair[0] = s0;
      this.pair[1] = s1;
      this.checkPlayerAntHit(this.pair);
    }
  }
};

Test42PlayScreen.prototype.checkPlayerAntHit = function(pair) {
  if (this.getSpiritPairMatchingTypes(pair, Test42BaseScreen.SpiritType.PLAYER, Test42BaseScreen.SpiritType.ANT)) {
    this.killPlayerSpirit(pair[0]);
  }
};

Test42PlayScreen.prototype.killPlayerSpirit = function(spirit) {
  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    if (slot.playerControls == spirit.controls) {
      spirit.explode();
      this.removeByBodyId(spirit.bodyId);
      slot.leave();
      return;
    }
  }
};