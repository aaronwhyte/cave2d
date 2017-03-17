/**
 * @constructor
 * @extends {Spirit}
 */
function BaseSpirit(screen) {
  Spirit.call(this);

  this.tempBodyPos = new Vec2d();
  this.scanVec = new Vec2d();
  this.scanResp = new ScanResponse();
  BaseSpirit.prototype.reset.call(this, screen);
}
BaseSpirit.prototype = new Spirit();
BaseSpirit.prototype.constructor = BaseSpirit;

BaseSpirit.prototype.reset = function(screen) {
  this.screen = screen;

  // Violate Law of Demeter here :-/
  if (this.screen) {
    this.stamps = this.screen.stamps;
    this.sounds = this.screen.sounds;
  }

  this.bodyId = -1;
  this.id = -1;
  this.modelStamp = null;
  this.tempBodyPos.reset();
};

BaseSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

BaseSpirit.prototype.setColorRGB = function(r, g, b) {
  this.color.setXYZ(r, g, b);
};

/**
 * @param group
 * @param pos
 * @param dir
 * @param dist
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scan = function(group, pos, dir, dist, rad) {
  return this.screen.scan(
      group,
      pos,
      this.scanVec.setXY(
          Math.sin(dir) * dist,
          Math.cos(dir) * dist),
      rad,
      this.scanResp);
};

/**
 * @param group
 * @param pos
 * @param vel
 * @param rad
 * @returns {number} a fraction (0 to 1) of the total scan distance , or -1 if there was no hit
 */
BaseSpirit.prototype.scanWithVel = function(group, pos, vel, rad) {
  return this.screen.scan(
      group,
      pos,
      vel,
      rad,
      this.scanResp);
};

BaseSpirit.prototype.getScanHitSpirit = function() {
  var body = this.screen.world.getBodyByPathId(this.scanResp.pathId);
  return this.screen.getSpiritForBody(body);
};

BaseSpirit.prototype.getBody = function() {
  return this.screen.world.bodies[this.bodyId];
};

BaseSpirit.prototype.getBodyPos = function() {
  var body = this.getBody();
  return body ? body.getPosAtTime(this.now(), this.tempBodyPos) : null;
};

BaseSpirit.prototype.setBodyVel = function(v) {
  var body = this.getBody();
  return body ? body.setVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.addBodyVel = function(v) {
  var body = this.getBody();
  return body ? body.setVelAtTime(v, this.now()) : null;
};

BaseSpirit.prototype.getBodyAngPos = function() {
  var body = this.getBody();
  return body ? body.getAngPosAtTime(this.now()) : null;
};

BaseSpirit.prototype.setBodyAngPos = function(ap) {
  var body = this.getBody();
  if (body) {
    body.setAngPosAtTime(ap, this.now());
  }
};

BaseSpirit.prototype.getBodyAngVel = function() {
  var body = this.getBody();
  return body ? body.angVel : null;
};

BaseSpirit.prototype.setBodyAngVel = function(av) {
  var body = this.getBody();
  if (body) {
    return body.setAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.addBodyAngVel = function(av) {
  var body = this.getBody();
  if (body) {
    return body.addAngVelAtTime(av, this.now());
  }
};

BaseSpirit.prototype.now = function() {
  return this.screen.now();
};
