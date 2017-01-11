/**
 * WebGL editor for a single level
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (ScreenPage)
 */
function EditLevelPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  ScreenPage.call(this, null, gameTitle, basePath, fileTree, adventureName, levelName);
}
EditLevelPage.prototype = new ScreenPage();
EditLevelPage.prototype.constructor = EditLevelPage;

EditLevelPage.prototype.maybeSaveLevel = function() {
  if (!this.screen) {
    console.warn('No screen, cannot get JSON to save level: ' + this.levelName);
    return;
  }
  this.jsonObj = this.screen.worldToJson();
  this.fileTree.setFile(this.levelDataPath, this.jsonObj);
};

EditLevelPage.prototype.refreshPauseMenu = function() {
  var df = document.createDocumentFragment();
  var e;

  var nav = Dom.ce('div', df, 'levelEditorNav');

  e = Dom.ce('div', nav);
  e = Dom.ce('a', e);
  var query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerHTML = Strings.textToHtml(this.adventureName);

  e = Dom.ce('div', nav, 'levelEditorLevelName');
  e.innerHTML = Strings.textToHtml(this.levelName);

  this.appendFullScreenButton(df);
  Dom.ce('br', df);
  this.appendResumeButton(df);

  this.pauseMenuDiv.innerHTML = '';
  this.pauseMenuDiv.appendChild(df);
};

EditLevelPage.prototype.maybeCreateScreen = function() {
  if (this.screen) return;
  this.screen = new Game2EditScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx, this.adventureName, this.levelName);
  this.screen.initWidgets();
  this.screen.initEditor();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  if (this.jsonObj) {
    this.screen.loadWorldFromJson(this.jsonObj);
  } else {
    this.screen.createDefaultWorld();
  }
  this.screen.startRecordingChanges();

  this.requestAnimation();
};
