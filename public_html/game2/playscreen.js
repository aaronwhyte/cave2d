/**
 * @constructor
 * @extends {BaseScreen}
 */
function PlayScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
  BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.1, 1, 35);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  this.playerAveragePos = new Vec2d();
  this.players = [];

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    for (var i = 0; i < self.players.length; i++) {
      self.players[i].setKeyboardTipTimeoutMs(ms);
    }
  };

  this.doubleTapWidget = new ClearDoubleTapWidget(this.getHudEventTarget())
      .setColorVec4(new Vec4(1, 1, 1, 0.5))
      .startListening();

  this.doubleTapFn = function() {
    self.setPaused(true);
  };

  this.keys = new Keys();
  this.spacebarFn = function(e) {
    e = e || window.event;
    if (e.keyCode == self.keys.getKeyCodeForName(Key.Name.SPACE)) {
      self.pauseDownFn();
    }
  };

  this.pauseDownFn = function(e) {
    e = e || window.event;
    self.setPaused(!self.paused);
    // Stop the flow of mouse-emulation events on touchscreens, so the
    // mouse events don't cause weird cursors teleports.
    // See http://www.html5rocks.com/en/mobile/touchandmouse/#toc-together
    e.preventDefault();
  };

  this.fullScreenFn = function(e) {
    e = e || window.event;
    self.controller.requestFullScreen();
    e.preventDefault();
  };
}
PlayScreen.prototype = new BaseScreen();
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.WIDGET_RADIUS = 60;

PlayScreen.prototype.updateHudLayout = function() {
  var rad = Math.min((this.canvas.width + this.canvas.height) / 20, PlayScreen.WIDGET_RADIUS);
  this.doubleTapWidget
      .setCanvasPositionXY(this.canvas.width / 2, this.canvas.height / 2)
      .setCanvasScaleXY(rad, rad);
};

PlayScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.doubleTapWidget.addDoubleTapListener(this.doubleTapFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.addEventListener('click', this.fullScreenFn);
    fsb.addEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.addEventListener('click', this.pauseDownFn);
    rb.addEventListener('touchend', this.pauseDownFn);

    this.canvas.addEventListener('mousemove', this.keyTipRevealer);
    window.addEventListener('keydown', this.keyTipRevealer);
    window.addEventListener('keydown', this.spacebarFn);

  } else {
    // TODO use ListenerTracker

    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].stopListening();
    }
    this.doubleTapWidget.removeDoubleTapListener(this.doubleTapFn);

    fsb = document.querySelector('#fullScreenButton');
    fsb.removeEventListener('click', this.fullScreenFn);
    fsb.removeEventListener('touchend', this.fullScreenFn);

    rb = document.querySelector('#resumeButton');
    rb.removeEventListener('click', this.pauseDownFn);
    rb.removeEventListener('touchend', this.pauseDownFn);

    this.canvas.removeEventListener('mousemove', this.keyTipRevealer);
    window.removeEventListener('keydown', this.keyTipRevealer);
    window.removeEventListener('keydown', this.spacebarFn);
  }
  this.listening = listen;
};

PlayScreen.prototype.setPaused = function(paused) {
  this.paused = paused;
  if (this.paused) {
    // pause
    this.showPausedOverlay();
  } else {
    // resume
    this.hidePausedOverlay();
    this.controller.requestAnimation();
    this.doubleTapWidget.fade();
  }
};

PlayScreen.prototype.lazyInit = function() {
  if (!this.initialized) {
    this.initSpiritConfigs();
    this.updateHudLayout();
    this.initPermStamps();
    this.initWorld();
    this.initialized = true;
  }
};

PlayScreen.prototype.initPermStamps = function() {
  this.cubeStamp = RigidModel.createCube().createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.cubeStamp);

  this.circleStamp = RigidModel.createCircleMesh(5).createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.circleStamp);

  var pauseModel = new RigidModel();
  for (var x = -1; x <= 1; x+=2) {
    pauseModel.addRigidModel(RigidModel.createSquare().transformPositions(
        new Matrix44()
            .multiply(new Matrix44().toScaleOpXYZ(0.4, 1, 1)
                .multiply(new Matrix44().toTranslateOpXYZ(x*1.5, 0, 0)
            ))));
  }
  this.pauseStamp = pauseModel.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.pauseStamp);
  this.doubleTapWidget.setStamp(this.pauseStamp);

  var model = RigidModel.createDoubleRing(64);
  this.soundStamp = model.createModelStamp(this.renderer.gl);
  this.levelStamps.push(this.soundStamp);
};

PlayScreen.prototype.addNoteSplash = function(x, y, dx, dy, r, g, b, bodyRad) {
  var fullRad = bodyRad * 2;// * (1+Math.random()/2);
  var s = this.splash;
  s.reset(PlayScreen.SplashType.NOTE, this.soundStamp);

  s.startTime = this.world.now;
  s.duration = 10;

  s.startPose.pos.setXYZ(x, y, 0);
  s.endPose.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose.scale.setXYZ(fullRad, fullRad, 1);
  s.endPose.scale.setXYZ(fullRad*2, fullRad*2, 1);

  s.startPose2.pos.setXYZ(x, y, 0);
  s.endPose2.pos.setXYZ(x + dx * s.duration, y + dy * s.duration, 1);
  s.startPose2.scale.setXYZ(fullRad*0.5, fullRad*0.5, 1);
  s.endPose2.scale.setXYZ(fullRad*1.9, fullRad*1.9, 1);

  s.startPose.rotZ = s.startPose2.rotZ = Math.PI * 2 * Math.random();
  s.endPose.rotZ = s.endPose2.rotZ = s.startPose.rotZ + 0.3 * Math.PI * (Math.random() - 0.5);

  s.startColor.setXYZ(r, g, b);
  s.endColor.setXYZ(r, g, b);

  s.duration = 8;
  s.endPose.rotZ = s.endPose2.rotZ =s.startPose2.rotZ;
  this.splasher.addCopy(s);
};

PlayScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

PlayScreen.prototype.handleInput = function() {
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].handleInput();
  }
};

PlayScreen.prototype.addPlayer = function() {
  var p = new Player();
  var trackball = this.createTrackball();
  var buttons = this.createButtonWidgets();
  p.setControls(trackball, buttons[0], buttons[1]);
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
      p.addSpirit(spirit);
    }
  }
  this.players.push(p);
};

PlayScreen.prototype.getAveragePlayerPos = function() {
  this.playerAveragePos.reset();
  var playerCount = 0;
  for (var id in this.world.spirits) {
    var spirit = this.world.spirits[id];
    spirit.onDraw(this.world, this.renderer);
    if (spirit.type == BaseScreen.SpiritType.PLAYER) {
      var body = spirit.getBody(this.world);
      if (body) {
        this.playerAveragePos.add(this.getBodyPos(body, this.vec2d));
        playerCount++;
      }
    }
  }
  if (playerCount != 0) {
    this.playerAveragePos.scale(1 / playerCount);
    return this.playerAveragePos;
  } else {
    return null;
  }
};

PlayScreen.prototype.snapCameraToPlayers = function() {
  var pos = this.getAveragePlayerPos();
  if (pos) {
    this.camera.set(pos);
  }
};

PlayScreen.prototype.drawScene = function() {
  if (!this.players.length) {
    this.addPlayer();
  }
  this.renderer.setViewMatrix(this.viewMatrix);
  this.hitsThisFrame = 0;

  var averagePlayerPos = this.getAveragePlayerPos();
  if (averagePlayerPos) {
    this.camera.follow(this.playerAveragePos);
  }

  this.sfx.setListenerXYZ(this.camera.getX(), this.camera.getY(), 5);

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.drawHud();
  this.configMousePointer();

  if (this.restarting) {
    this.controller.restart();
    this.restarting = false;
  } else {
    // Animate whenever this thing draws.
    if (!this.paused) {
      this.controller.requestAnimation();
    }
  }
};

PlayScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.doubleTapWidget.draw(this.renderer);
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].drawHud(this.renderer);
  }
  this.renderer.setBlendingEnabled(false);
};

PlayScreen.prototype.configMousePointer = function() {
  if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

/////////////////
// Spirit APIs //
/////////////////

PlayScreen.prototype.isPlaying = function() {
  return true;
};
