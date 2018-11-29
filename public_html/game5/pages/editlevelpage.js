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
  this.setLevelJsonObj(this.screen.worldToJson());
};

EditLevelPage.prototype.refreshPauseMenu = function() {
  let df = document.createDocumentFragment();
  let e;

  let nav = Dom.ce('div', df, 'levelEditorNav');

  e = Dom.ce('div', nav);
  e = Dom.ce('a', e);
  let query = {};
  query[EditorApp.PARAM_ADVENTURE_NAME] = this.adventureName;
  e.href = '#' + Url.encodeQuery(query);
  e.innerHTML = Strings.textToHtml(this.adventureName);

  e = Dom.ce('div', nav, 'levelEditorLevelName');
  e.innerHTML = Strings.textToHtml(this.levelName);

  this.appendDebugOptions(df);

  this.appendFullScreenButton(df);
  Dom.ce('br', df);
  this.appendResumeButton(df);

  this.pauseMenuDiv.innerHTML = '';
  this.pauseMenuDiv.appendChild(df);
};

EditLevelPage.prototype.appendDebugOptions = function(df) {
  let debug = Dom.ce('div', df, 'levelEditorDebugOptions');

  let label = Dom.ce('label', debug);
  let e = Dom.ce('input', label);
  e.type = 'checkbox';
  e.defaultChecked = SHOULD_DRAW_STATS_DEFAULT;
  let self = this;
  e.addEventListener('change', function (element) {
    self.screen.shouldDrawStats = element.target.checked;
    self.requestAnimation();
  });
  e = Dom.ce('span', label);
  e.innerHTML = Strings.textToHtml(' show stats');
};


EditLevelPage.prototype.maybeCreateScreen = function() {
  if (this.screen) return;
  this.screen = new Game5EditScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx, this.adventureName, this.levelName);
  this.screen.initWidgets();
  this.screen.initEditor();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  let levelObj = this.getLevelJsonObj();
  if (levelObj) {
    this.screen.loadWorldFromJson(levelObj);
  } else {
    this.screen.createDefaultWorld();
  }
  this.screen.startRecordingChanges();

  this.requestAnimation();
};
