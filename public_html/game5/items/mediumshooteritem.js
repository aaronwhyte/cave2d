/**
 * @constructor
 * @extends {BaseItem}
 */
function MediumShooterItem() {
  BaseItem.call(this, Game5Key.MEDIUM_SHOOTER, true, "medium shooter");
}
MediumShooterItem.prototype = new BaseItem();
MediumShooterItem.prototype.constructor = MediumShooterItem;

MediumShooterItem.prototype.createTool = function(screen) {
  return new MediumShooter(screen);
};
