/**
 * @constructor
 * @extends {BaseItem}
 */
function LaserWeaponItem() {
  BaseItem.call(this, Game5Key.LASER_WEAPON, true, "laser weapon");
}
LaserWeaponItem.prototype = new BaseItem();
LaserWeaponItem.prototype.constructor = LaserWeaponItem;

LaserWeaponItem.prototype.createTool = function(screen) {
  return new LaserWeapon(screen);
};
