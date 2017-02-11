/**
 * @constructor
 * @extends {Test42BaseScreen}
 */
function Test42PlayScreen(controller, canvas, renderer, stamps, sfx) {
  Test42BaseScreen.call(this, controller, canvas, renderer, stamps, sfx);

  this.camera = new Camera(0.2, 0.6, 30);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.hudViewMatrix = new Matrix44();

  this.playerSpirits = [];
}
Test42PlayScreen.prototype = new Test42BaseScreen();
Test42PlayScreen.prototype.constructor = Test42PlayScreen;

Test42PlayScreen.ANT_RAD = 1.2;

Test42PlayScreen.MAX_UNDO_DEPTH = 20000;

Test42PlayScreen.prototype.updateHudLayout = function() {
  this.canvasCuboid.setToCanvas(this.canvas);
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

  this.slots = [
      createKeyboardSlot(Key.Name.UP, Key.Name.RIGHT, Key.Name.DOWN, Key.Name.LEFT, ',', '.', '/'),
      createKeyboardSlot('w', 'd', 's', 'a', 'z', 'x', 'q')
  ];

  for (var i = 0; i < this.slots.length; i++) {
    var slot = this.slots[i];
    slot.enable();
    slot.joinTrigger.addTriggerDownListener(this.createJoinFn(slot));
  }
};

Test42PlayScreen.prototype.createJoinFn = function(slot) {
  var self = this;
  return function() {
    var spiritId = self.addItem(Test42BaseScreen.MenuItem.PLAYER, new Vec2d(0, 0), 0);
    var spirit = self.world.spirits[spiritId];
    spirit.setControls(slot.playerControls);
    spirit.setColorRGB(Math.random() + 0.5, 2*Math.random() + 0.5, Math.random() + 0.7);
    self.playerSpirits.push(spirit);
    slot.join();
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
      this.removeByBodyId(spirit.bodyId);
      slot.leave();
      return;
    }
  }
};