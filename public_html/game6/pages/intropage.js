/**
 * hello
 * @param {PlayApp} app
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
};

IntroPage.prototype.refreshPauseMenu = function() {
  let df = document.createDocumentFragment();
  let e;
  this.appendTitle(df);
  this.appendFullScreenButton(df);

  Dom.ce('br', df);
  this.appendResumeButton(df, 'unpause');
  this.setPauseMenuContent(df);
};

