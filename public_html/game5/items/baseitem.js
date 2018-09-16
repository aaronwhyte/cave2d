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
  this.wielderId = -1;
}

BaseItem.prototype.createTool = function(screen) {
  return null; // override me
};

BaseItem.prototype.onPickup = function(screen, spirit) {
  if (!this.tool) {
    this.tool = this.createTool(screen);
  }
  this.wielderId = spirit.id;
};

BaseItem.prototype.onDrop = function() {
  if (this.tool) {
    this.tool.setButtonDown(false);
    // TODO: erase tool-ish spirit from world? Is it even in there? I forget.
    this.wielderId = -1;
    this.tool.setWielderId(this.wielderId);
  }
};


BaseItem.prototype.onSelect = function() {
  if (this.tool) {
    this.tool.setWielderId(this.wielderId);
  }
};

BaseItem.prototype.onUnSelect = function() {
  if (this.tool) {
    this.tool.setButtonDown(false);
  }
};


BaseItem.prototype.onButtonDown = function(index) {
  if (this.tool) {
    this.tool.setButtonDown(true);
  }
};

BaseItem.prototype.onButtonUp = function(index) {
  if (this.tool) {
    this.tool.setButtonDown(false);
  }
};