/**
 * State data for a view in a 2d plane, including pan and zoom.
 *
 * @constructor
 */
function Camera() {
  this.pan = new Vec2d();
  this.zoom = 1;
  this.rotation = 0;
}

/**
 * Transforms a canvas context from viewport to camera.
 * After that, drawings in world coords should appear in the right place
 * on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 */
Camera.prototype.transformContext = function(ctx) {
  ctx.scale(this.zoom, this.zoom);
  ctx.rotate(this.rotation);
  ctx.translate(-this.pan.x, -this.pan.y);
};

Camera.prototype.setPanXY = function(x, y) {
  this.pan.setXY(x, y);
};

Camera.prototype.setPan = function(vec) {
  this.pan.set(vec);
};

Camera.prototype.setZoom = function(zoom) {
  this.zoom = zoom;
};

Camera.prototype.setRotation = function(rotation) {
  this.rotation = rotation;
};


Camera.prototype.getPanX = function() {
  return this.pan.x;
};

Camera.prototype.getPanY = function() {
  return this.pan.y;
};

Camera.prototype.getPan = function(out) {
  return out.set(this.pan);
};

Camera.prototype.getZoom = function() {
  return this.zoom;
};

Camera.prototype.getRotation = function() {
  return this.rotation;
};


Camera.prototype.viewportToCamera = function(vec) {
  vec.scale(1/this.zoom);
  vec.rot(this.rotation);
  vec.addXY(this.pan.x, this.pan.y);
  return vec;
};
