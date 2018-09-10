/**
 * @param {ModelId} iconModelId
 * @param {Array.<ModelId>} buttonModelIds  This also indicates how many buttons there are, from 0 to 2
 * @param {boolean} droppable
 * @param {=String} opt_desc  optional short text description of the tool, visible in-game
 * @constructor
 */
function BaseItem(iconModelId, buttonModelIds, droppable, opt_desc) {
  this.iconModelId = iconModelId;
  this.buttomModelIds = buttonModelIds;
  this.droppable = droppable;
  this.desc = opt_desc || "";
}

BaseItem.prototype.onPickup = function() {};
BaseItem.prototype.onDrop = function() {};

BaseItem.prototype.onSelect = function() {};
BaseItem.prototype.onUnSelect = function() {};

BaseItem.prototype.onButtonDown = function(index) {};
BaseItem.prototype.onButtonUp = function(index) {};
