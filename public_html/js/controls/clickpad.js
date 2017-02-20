/**
 * ClickPad simulates (or wraps) four clickable arrow keys, and provides distinct events, not a continuous val.
 * @constructor
 */
function ClickPad() {
  this.clickPubSub = new PubSub();
}

ClickPad.UP = new Vec2d(0, 1);
ClickPad.RIGHT = new Vec2d(1, 0);
ClickPad.DOWN = new Vec2d(0, -1);
ClickPad.LEFT = new Vec2d(-1, 0);

ClickPad.prototype.startListening = function() {console.log("startListening unimplimented")};
ClickPad.prototype.stopListening = function() {console.log("stopListening unimplimented")};

/**
 * A function that takes x and y as params
 * @param {Function} fn
 */
ClickPad.prototype.addListener = function(fn) {
  this.clickPubSub.subscribe(fn);
};

/**
 * A function that takes x and y as params
 * @param {Function} fn
 */
ClickPad.prototype.removeListener = function(fn) {
  this.clickPubSub.unsubscribe(fn);
};

ClickPad.prototype.poll = function() {
};
