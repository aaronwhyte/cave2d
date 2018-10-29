/**
 * You Win! Roll credits!
 * @param {PlayApp} app
 * @constructor
 * @extends (Page)
 */
function VictoryPage(app) {
  Page.call(this);
  this.app = app;
}
VictoryPage.prototype = new Page();
VictoryPage.prototype.constructor = VictoryPage;

VictoryPage.prototype.enterDoc = function() {
  Page.prototype.enterDoc.call(this);
  this.exitPointerLock();
  var df = document.createDocumentFragment();

  this.div = Dom.ce('div', df);
  this.div.innerHTML = '<h1>The game is over! You win!</h1><a href="../" style="color:silver">back to <b>cave2d.com</b></a>';
  document.body.appendChild(df);
  document.body.classList.add('victoryPage');

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  this.oldMetaViewportContent = metaViewport.content;
  metaViewport.content = 'width=device-width';

  this.sfx = new SoundFx();
  this.sfx.setListenerXYZ(0, 0, 5);
};

VictoryPage.prototype.exitDoc = function() {
  Page.prototype.exitDoc.call(this);
  document.body.removeChild(this.div);
  document.body.classList.remove('victoryPage');
  this.canvas = null;
  this.pauseMenuDiv = null;
  this.animationId = 0;

  var metaViewport = document.head.querySelector('meta[name="viewport"]');
  metaViewport.content = this.oldMetaViewportContent;
  this.oldMetaViewportContent = null;
};
