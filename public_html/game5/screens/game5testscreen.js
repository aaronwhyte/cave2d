/**
 * @constructor
 * @extends {Game5PlayScreen}
 */
function Game5TestScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game5PlayScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);

  this.shouldDrawStats = SHOULD_DRAW_STATS_DEFAULT;
}
Game5TestScreen.prototype = new Game5PlayScreen();
Game5TestScreen.prototype.constructor = Game5TestScreen;

Game5TestScreen.prototype.updateHudLayout = function() {
  this.untestTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game5BaseScreen.WIDGET_RADIUS, Game5BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game5BaseScreen.WIDGET_RADIUS, Game5BaseScreen.WIDGET_RADIUS, 0);
};

Game5TestScreen.prototype.initWidgets = function() {
  let self = this;
  this.untestDownFn = function(e) {
    e = e || window.event;
    let query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EDIT;
    Url.setFragment(Url.encodeQuery(query));

    // Drop all the players, so their controls will unlisten.
    for (let slotName in self.slots) {
      let slot = self.slots[slotName];
      if (slot.isPlaying()) {
        slot.setState(ControlState.WAITING);
      }
    }
    // Always release pointerlock when exiting the test page.
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    e.preventDefault();
  };

  this.untestTriggerWidget = new TriggerWidget(this.getHudEventTarget())
      .addTriggerDownListener(this.untestDownFn)
      .setReleasedColorVec4(new Vec4(1, 1, 1, 0.5))
      .setPressedColorVec4(new Vec4(1, 1, 1, 1))
      .listenToTouch()
      .listenToMousePointer()
      .addTriggerKeyByName('t')
      .setStamp(this.stamps.untestStamp)
      .setKeyboardTipStamp(this.glyphs.initStamps(this.renderer.gl)['T']);
  this.addListener(this.untestTriggerWidget);
  this.widgets.push(this.untestTriggerWidget);
};

Game5TestScreen.prototype.startExit = function() {
  // ignore in test screen
};

Game5TestScreen.prototype.exitLevel = function() {
  // ignore in test screen
};
