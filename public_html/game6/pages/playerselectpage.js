/**
 * Add/remove players and controls.
 * @param {PlayApp} app
 * @constructor
 * @extends (Page)
 */
function PlayerSelectPage(app) {
  Page.call(this);
  this.app = app;
}
PlayerSelectPage.prototype = new Page();
PlayerSelectPage.prototype.constructor = PlayerSelectPage;

PlayerSelectPage.CSS_CLASS = 'PlayerSelectPage';

PlayerSelectPage.prototype.enterDoc = function() {
  Page.prototype.enterDoc.call(this);
  this.exitPointerLock();
  let df = document.createDocumentFragment();

  this.div = Dom.ce('div', df);

  this.div.innerHTML = 'player select page goes here';

  document.body.appendChild(df);
  document.body.classList.add(PlayerSelectPage.CSS_CLASS);

  let metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width';

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);
};

PlayerSelectPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
  document.body.removeChild(this.div);
  document.body.classList.remove(PlayerSelectPage.CSS_CLASS);

  let metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};
