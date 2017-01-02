/**
 * @constructor
 * @extends {Game3BaseScreen}
 */
function Game3EditScreen(controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName) {
  Game3BaseScreen.call(this, controller, canvas, renderer, glyphs, stamps, sfx, adventureName, levelName);

  this.camera = new Camera(0.2, 0.6, Game3BaseScreen.CAMERA_VIEW_DIST);
  this.updateViewMatrix();
  this.renderer.setViewMatrix(this.viewMatrix);

  var self = this;

  this.keyTipRevealer = function() {
    var ms = Date.now() + Editor.KEYBOARD_TIP_TIMEOUT_MS;
    self.testTriggerWidget.setKeyboardTipTimeoutMs(ms);
    self.editor.setKeyboardTipTimeoutMs(ms);
  };
}
Game3EditScreen.prototype = new Game3BaseScreen();
Game3EditScreen.prototype.constructor = Game3EditScreen;

Game3EditScreen.ROUND_VELOCITY_TO_NEAREST = 0.001;

Game3EditScreen.ANT_RAD = 0.8;
Game3EditScreen.ROCK_RAD = 1.4;

Game3EditScreen.prototype.initEditor = function() {
  this.editor = new Editor(this, this.canvas, this.renderer, this.glyphs, EditorStamps.create(this.renderer));
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t].menuItemConfig;
    if (c) {
      this.editor.addMenuItem(c.group, c.rank, c.itemName, c.model);
    }
  }
  for (var group = 0; group < this.editor.getMaxGroupNum(); group++) {
    this.editor.addMenuKeyboardShortcut(group, group + 1);
  }
};

Game3EditScreen.prototype.updateHudLayout = function() {
  this.testTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game3BaseScreen.WIDGET_RADIUS, Game3BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game3BaseScreen.WIDGET_RADIUS, Game3BaseScreen.WIDGET_RADIUS, 0);
  this.editor.updateHudLayout();
};

Game3EditScreen.prototype.setScreenListening = function(listen) {
  if (listen == this.listening) return;
  var fsb, rb, i;
  Game3BaseScreen.prototype.setScreenListening.call(this, listen);
  if (listen) {
    for (i = 0; i < this.listeners.vals.length; i++) {
      this.listeners.vals[i].startListening();
    }
    this.testTriggerWidget.startListening();

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
    this.testTriggerWidget.stopListening();;

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

Game3EditScreen.prototype.initWidgets = function() {
  var self = this;
  this.testDownFn = function(e) {
    e = e || window.event;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_TEST;
    Url.setFragment(Url.encodeQuery(query));
    e.preventDefault();
  };

  this.testTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.testDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('t')
      .setStamp(this.stamps.testStamp)
      .setKeyboardTipStamp(this.glyphs.initStamps(this.renderer.gl)['T']);
};

Game3EditScreen.prototype.toJSON = function() {
  var worldJsoner = new WorldJsoner();
  worldJsoner.setIsBodySerializableFn(function(body) {
    return body.hitGroup != Game3BaseScreen.Group.WALL;
  });
  worldJsoner.roundBodyVelocities(this.world, Game3EditScreen.ROUND_VELOCITY_TO_NEAREST);
  var json = worldJsoner.worldToJson(this.world);
  json.terrain = this.bitGrid.toJSON();
  json.cursorPos = this.editor.cursorPos.toJSON();
  json.cameraPos = this.camera.cameraPos.toJSON();
  return json;
};

Game3EditScreen.prototype.createDefaultWorld = function() {
  this.tileGrid.drawTerrainPill(Vec2d.ZERO, Vec2d.ZERO, 9.8, 1);
};

Game3EditScreen.prototype.onHitEvent = function(e) {
  var b0 = this.world.getBodyByPathId(e.pathId0);
  var b1 = this.world.getBodyByPathId(e.pathId1);
  if (b0 && b1) {
    this.resolver.resolveHit(e.time, e.collisionVec, b0, b1);
  }
};

Game3EditScreen.prototype.handleInput = function () {
  if (!this.world) return;
  this.editor.handleInput();
};

Game3EditScreen.prototype.drawScene = function() {
  this.renderer.setViewMatrix(this.viewMatrix);
  for (var id in this.world.spirits) {
    this.world.spirits[id].onDraw(this.world, this.renderer);
  }

  this.drawTiles();
  this.splasher.draw(this.renderer, this.world.now);
  this.editor.drawScene();
  this.drawHud();
  this.configMousePointer();

  // Animate whenever this thing draws.
  if (!this.paused) {
    this.controller.requestAnimation();
  }
};

Game3EditScreen.prototype.drawHud = function() {
  this.hudViewMatrix.toIdentity()
      .multiply(this.mat44.toScaleOpXYZ(
              2 / this.canvas.width,
              -2 / this.canvas.height,
          1))
      .multiply(this.mat44.toTranslateOpXYZ(-this.canvas.width/2, -this.canvas.height/2, 0));
  this.renderer.setViewMatrix(this.hudViewMatrix);

  this.updateHudLayout();
  this.renderer.setBlendingEnabled(true);
  this.testTriggerWidget.draw(this.renderer);
  this.editor.drawHud();
  this.renderer.setBlendingEnabled(false);
};

Game3EditScreen.prototype.configMousePointer = function() {
  if (this.editor.isMouseHovered() || this.testTriggerWidget.isMouseHovered()) {
    this.canvas.style.cursor = "auto"
  } else if (this.paused) {
    this.canvas.style.cursor = "";
  } else {
    this.canvas.style.cursor = "crosshair";
  }
};

/////////////////////
// Editor API stuff
/////////////////////

Game3EditScreen.prototype.addItem = function(name, pos, dir) {
  for (var t in this.spiritConfigs) {
    var c = this.spiritConfigs[t];
    if (c.menuItemConfig && c.menuItemConfig.itemName == name) {
      c.menuItemConfig.factory(this, c.stamp, pos, dir);
      break;
    }
  }
};

/////////////////
// Spirit APIs //
/////////////////

Game3EditScreen.prototype.isPlaying = function() {
  return false;
};
