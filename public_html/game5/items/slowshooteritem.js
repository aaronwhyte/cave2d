/**
 * @constructor
 * @extends {BaseItem}
 */
function SlowShooterItem() {
  BaseItem.call(this, ModelId.SLOW_SHOOTER, ModelId.SLOW_SHOOTER, true, "slow shooter");
}
SlowShooterItem.prototype = new BaseItem();
SlowShooterItem.prototype.constructor = SlowShooterItem;

SlowShooterItem.prototype.createTool = function(screen) {
  return new SlowShooter(screen);
};
