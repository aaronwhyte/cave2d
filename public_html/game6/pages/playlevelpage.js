/**
 * WebGL play page for a single level
 * @param {PlayApp} app
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @param {*} startingGameState
 * @constructor
 * @extends (ScreenPage)
 */
function PlayLevelPage(app, gameTitle, basePath, fileTree, adventureName, levelName, startingGameState) {
  ScreenPage.call(this, app, gameTitle, basePath, fileTree, adventureName, levelName, startingGameState);
}
PlayLevelPage.prototype = new ScreenPage();
PlayLevelPage.prototype.constructor = PlayLevelPage;

PlayLevelPage.prototype.refreshPauseMenu = function() {
  let df = document.createDocumentFragment();
  let e;
  this.appendTitle(df);
  this.appendFullScreenButton(df);

  Dom.ce('br', df);
  this.appendResumeButton(df, 'play');
  this.setPauseMenuContent(df);
};

PlayLevelPage.prototype.maybeCreateScreen = function() {
  if (this.screen) {
    console.log('screen already exists');
    return;
  }
  if (!this.renderer) {
    console.log('no renderer');
    return;
  }
  if (!this.getLevelJsonObj()) {
    console.log('no jsonObj');
    return;
  }

  this.screen = new Game6PlayScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx,
      this.adventureName, this.levelName);
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.getLevelJsonObj());
  this.screen.configurePlayerSlots();
  this.screen.setPaused(this.paused);
  this.screen.snapCameraToEntrance();
  this.screen.restoreGameState(this.startingGameState);

  this.requestAnimation();
};

PlayLevelPage.prototype.exitLevel = function(exitGameState) {
  this.screen.destroyScreen();
  this.screen = null;
  this.app.exitLevel(this.adventureName, this.levelName, exitGameState);
};
