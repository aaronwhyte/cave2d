/**
 * hello
 * @param {PlayApp} app
 * @param gameTitle
 * @param basePath
 * @param fileTree
 * @param adventureName
 * @param levelName
 * @constructor
 * @extends (ScreenPage)
 */
function IntroPage(app, gameTitle, basePath, fileTree, adventureName, levelName) {
  ScreenPage.call(this, app, gameTitle, basePath, fileTree, adventureName, levelName);
}
IntroPage.prototype = new ScreenPage();
IntroPage.prototype.constructor = IntroPage;

IntroPage.prototype.maybeCreateScreen = function() {
  this.screen = new Game6IntroScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx,
      this.adventureName, this.levelName);
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.getLevelJsonObj());
  this.screen.initDistGrid();
};

IntroPage.prototype.refreshPauseMenu = function() {
  // there isn't one
};
