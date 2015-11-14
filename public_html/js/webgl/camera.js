function Camera(viewDist, minDistFraction, maxDistFraction) {
  this.cameraPos = new Vec2d();
  this.viewDist = viewDist;
  this.minDistFraction = minDistFraction;
  this.maxDistFraction = maxDistFraction;
}

Camera.prototype.follow = function(followPos) {
  var cameraDist = followPos.distance(this.cameraPos);
  var minCameraDist = this.viewDist * 0.2;
  var maxCameraDist = this.viewDist * 0.6;

  // Move towards min dist
  if (cameraDist > minCameraDist) {
    var temp = Vec2d.alloc();
    temp.set(followPos)
        .subtract(this.cameraPos)
        .scaleToLength((cameraDist-minCameraDist) * 0.1)
        .add(this.cameraPos);
    this.cameraPos.set(temp);
    cameraDist = followPos.distance(this.cameraPos);

    // Clip to max dist
    if (cameraDist > maxCameraDist) {
      temp.set(followPos)
          .subtract(this.cameraPos)
          .scaleToLength(cameraDist - maxCameraDist)
          .add(this.cameraPos);
      this.cameraPos.set(temp);
    }
    temp.free();
  }
};

Camera.prototype.getX = function() {
  return this.cameraPos.x;
};

Camera.prototype.getY = function() {
  return this.cameraPos.y;
};

Camera.prototype.getViewDist = function() {
  return this.viewDist;
};
