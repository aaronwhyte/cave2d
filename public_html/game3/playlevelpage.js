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
  let df = document.createDocumentFragment();
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

  this.screen = new PlayScreen(
      this, this.canvas, this.renderer, new Glyphs(new GlyphMaker(0.4, 1.2)), Stamps.create(this.renderer), this.sfx,
      this.adventureName, this.levelName);
  this.screen.initSpiritConfigs();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  this.screen.loadWorldFromJson(this.getLevelJsonObj());
  this.screen.setPaused(this.paused);
  this.screen.snapCameraToPlayers();
};