/**
 * Consolidates a bunch of editor-related spirit code for a single spirit,
 * mostly to make it easier to add a new spirit type, without
 * having to spread code all over the PlayScreen.
 * @param {function} ctor the spirit constructor
 * @param {ModelStamp} stamp
 * @param {BatchDrawer} batchDrawer
 * @param {MenuItemConfig} menuItemConfig in case this spirit type belongs in the menu
 * @constructor
 */
function SpiritConfig(ctor, stamp, batchDrawer, menuItemConfig) {
  this.ctor = ctor;
  this.stamp = stamp;
  this.batchDrawer = batchDrawer;
  this.menuItemConfig = menuItemConfig;
}
