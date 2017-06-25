/**
 * @constructor
 * @extends {Game4PlayScreen}
 */
function Game4TestScreen(controller, canvas, renderer, stamps, sfx, adventureName, levelName) {
  Game4PlayScreen.call(this, controller, canvas, renderer, stamps, sfx, adventureName, levelName);
}
Game4TestScreen.prototype = new Game4PlayScreen();
Game4TestScreen.prototype.constructor = Game4TestScreen;

Game4TestScreen.prototype.updateHudLayout = function() {
  this.untestTriggerWidget.getWidgetCuboid()
      .setPosXYZ(this.canvas.width - Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS * 3, 0)
      .setRadXYZ(Game4BaseScreen.WIDGET_RADIUS, Game4BaseScreen.WIDGET_RADIUS, 0);
};

Game4TestScreen.prototype.initWidgets = function() {
  var self = this;
  this.untestDownFn = function(e) {
    e = e || window.event;
    var query = {};
    query[EditorApp.PARAM_ADVENTURE_NAME] = self.adventureName;
    query[EditorApp.PARAM_LEVEL_NAME] = self.levelName;
    query[EditorApp.PARAM_MODE] = EditorApp.MODE_EDIT;
    Url.setFragment(Url.encodeQuery(query));
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

Game4TestScreen.prototype.startExit = function() {
  // ignore in test screen
};

Game4TestScreen.prototype.exitLevel = function() {
  // ignore in test screen
};
