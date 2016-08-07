/**
 * Optional editor menu-item aspects of the spirit config.
 * @param {String} itemName
 * @param {Number} group
 * @param {Number} rank
 * @param {RigidModel} model
 * @param {Function} factory (PlayScreen, pos, dir) for creating a Spirit (with Body) in the interactive editor.
 * @constructor
 */
function MenuItemConfig(itemName, group, rank, model, factory) {
  this.itemName = itemName;
  this.group = group;
  this.rank = rank;
  this.model = model;
  this.factory = factory;
}
