/**
 * WebGL play page for a single level
 * @param {PlayApp} app
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (ScreenPage)
 */
function PlayLevelPage(app, gameTitle, basePath, fileTree, adventureName, levelName) {
  ScreenPage.call(this, app, gameTitle, basePath, fileTree, adventureName, levelName);
}
PlayLevelPage.prototype = new ScreenPage();
PlayLevelPage.prototype.constructor = PlayLevelPage;

PlayLevelPage.prototype.refreshPauseMenu = function() {
  var df = document.createDocumentFragment();
  var e;
  this.appendTitle(df);
  this.appendFullScreenButton(df);
  Dom.ce('br', df);
  e = Dom.ce('button', df, 'smallButton');
  e.id = 'restartButton';
  e.innerHTML = Strings.textToHtml('restart level');
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

  this.screen = new Game2PlayScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx, this.adventureName, this.levelName);
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.getLevelJsonObj());
  this.screen.setPaused(this.paused);
  this.screen.snapCameraToPlayers();
};

PlayLevelPage.prototype.exitLevel = function() {
  this.screen.destroyScreen();
  this.screen = null;
  this.app.exitLevel(this.adventureName, this.levelName);
};

PlayLevelPage.prototype.restartLevel = function() {
  this.screen.destroyScreen();
  this.screen = null;
  this.app.restartLevel();
};