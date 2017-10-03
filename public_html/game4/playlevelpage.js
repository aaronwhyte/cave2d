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
 * @extends (Page)
 */
function PlayLevelPage(app, gameTitle, basePath, fileTree, adventureName, levelName, startingGameState) {
  ScreenPage.call(this, app, gameTitle, basePath, fileTree, adventureName, levelName, startingGameState);
}
PlayLevelPage.prototype = new ScreenPage();
PlayLevelPage.prototype.constructor = PlayLevelPage;

PlayLevelPage.prototype.refreshPauseMenu = function() {
  var df = document.createDocumentFragment();
  var e;
  this.appendTitle(df);
  this.appendFullScreenButton(df);

  // Dom.ce('br', df);
  // e = Dom.ce('button', df, 'smallButton');
  // e.id = 'restartButton';
  // e.innerHTML = Strings.textToHtml('restart level');

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
  if (!this.jsonObj) {
    console.log('no jsonObj');
    return;
  }

  this.screen = new Game4PlayScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx,
      this.adventureName, this.levelName);
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.jsonObj);
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

// PlayLevelPage.prototype.restartLevel = function() {
//   this.screen.destroyScreen();
//   this.screen = null;
//   this.app.restartLevel(this.startingGameState);
// };