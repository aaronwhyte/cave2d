/**
 * @constructor
 * @extends {Spirit}
 */
function BulletSpirit() {
  Spirit.call(this);
  this.reset();
}
BulletSpirit.prototype = new Spirit();
BulletSpirit.prototype.constructor = BulletSpirit;

Poolify(BulletSpirit);

BulletSpirit.TIMEOUT = 20;

BulletSpirit.prototype.reset = function() {
  this.bodyId = -1;
  this.id = -1;
};

BulletSpirit.prototype.onTimeout = function(world, timeout) {
  this.destroyBullet();
};

BulletSpirit.prototype.destroyBullet = function() {
  world.removeBodyId(this.bodyId);
  world.removeSpiritId(this.id);
};

BulletSpirit.prototype.onHit = function(world, thisBody, thatBody, hit) {
  //this.destroyBullet();
};
