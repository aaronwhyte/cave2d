/**
 * Base class for subclasses that take over the whole HTML page, including meta tags and
 * most of the content of the body.
 * @constructor
 */
function Page() {
}

/**
 * Page subclasses should add nodes, add listeners, adjust meta tags, etc. in this function.
 */
Page.prototype.enterDoc = function() {
};

/**
 * Page subclasses should remove nodes, remove listeners, restore meta tags, etc. in this function.
 * It should undo whatever was done in enterDoc.
 */
Page.prototype.exitDoc = function() {
};

/**
 * Optional function for WebGL pages that care about shader program text loading.
 * This is a function with two string params: vertexShaderText, fragmentShaderText.
 * It'll be called after enterDoc, either synchronously or asynchronously.
 * @type {function}
 */
Page.prototype.onShaderTextChange = null;
