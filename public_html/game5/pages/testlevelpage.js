/**
 * WebGL editor for a single level
 * @param {String} gameTitle
 * @param {Array.<String>} basePath of the game
 * @param {FileTree} fileTree
 * @param {String} adventureName
 * @param {String} levelName
 * @constructor
 * @extends (Page)
 */
function TestLevelPage(gameTitle, basePath, fileTree, adventureName, levelName) {
  ScreenPage.call(this, null, gameTitle, basePath, fileTree, adventureName, levelName);
}
TestLevelPage.prototype = new ScreenPage();
TestLevelPage.prototype.constructor = TestLevelPage;

TestLevelPage.prototype.maybeSaveLevel = function() {};

TestLevelPage.prototype.refreshPauseMenu = function() {
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

  this.setPauseMenuContent(df);
};

TestLevelPage.prototype.appendDebugOptions = function(df) {
  let debug = Dom.ce('div', df, 'levelEditorDebugOptions');
  let self = this;
  let label, e;

  label = Dom.ce('label', debug);
  e = Dom.ce('input', label);
  e.type = 'checkbox';
  e.defaultChecked = false;
  e.addEventListener('change', function(element) {
    self.screen.shouldDrawScans = element.target.checked;
  });
  e = Dom.ce('span', label);
  e.innerHTML = Strings.textToHtml(' draw rayscans');

  Dom.ce('br', debug);

  label = Dom.ce('label', debug);
  e = Dom.ce('input', label);
  e.type = 'checkbox';
  e.defaultChecked = SHOULD_DRAW_STATS_DEFAULT;
  e.addEventListener('change', function(element) {
    self.screen.shouldDrawStats = element.target.checked;
    self.requestAnimation();
  });
  e = Dom.ce('span', label);
  e.innerHTML = Strings.textToHtml(' show stats');
};

TestLevelPage.prototype.maybeCreateScreen = function() {
  this.screen = new Game5TestScreen(
      this, this.canvas, this.renderer, Stamps.create(this.renderer), this.sfx, this.adventureName, this.levelName);
  this.screen.initWidgets();
  this.screen.updateHudLayout();
  this.screen.initWorld();
  let levelObj = this.getLevelJsonObj();
  if (levelObj) {
    this.screen.loadWorldFromJson(levelObj);
  } else {
    this.screen.createDefaultWorld();
  }
  this.screen.configurePlayerSlots();
  this.screen.snapCameraToEntrance();

  this.requestAnimation();
};