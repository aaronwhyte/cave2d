/**
 * Abstract base class for an object that can listen for events, and draw to the canvas.
 * The details of canvas and renderer initilization and setting are up to the subclasses.
 * @constructor
 */
function Screen() {
}

/**
 * @param {boolean} listening Whether to listen for events or not.
 */
Screen.prototype.setScreenListening = function(listening) {
};

/**
 * Do physics and drawing, optionally lazily initializing first.
 * @param {number} visibility from 0 to 1
 */
Screen.prototype.drawScreen = function(visibility) {
};

/**
 * Unload resources that cannot garbage-collect themselves, like WebGL data.
 */
Screen.prototype.destroyScreen = function() {
};
