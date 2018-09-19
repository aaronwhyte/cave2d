/**
 * @param {Game5Key} key
 * @param {boolean} droppable
 * @param {=String} opt_desc  optional short text description of the tool, visible in-game
 * @constructor
 */
function BaseItem(key, droppable, opt_desc) {
  this.key = key;
  this.droppable = droppable;
  this.desc = opt_desc || "";
  this.ownerId = -1;
}

BaseItem.prototype.createTool = function(screen) {
  return null; // override me
};

BaseItem.prototype.onPickup = function(screen, spirit) {
  if (!this.tool) {
    this.tool = this.createTool(screen);
  }
  this.ownerId = spirit.id;
};

BaseItem.prototype.onDrop = function() {
  if (this.tool) {
    this.onUnselect();
    this.ownerId = -1;
  }
};


BaseItem.prototype.onSelect = function() {
  if (this.tool) {
    this.tool.setWielderId(this.ownerId);
  }
};

BaseItem.prototype.onUnselect = function() {
  if (this.tool) {
    this.tool.setButtonDown(false);
    this.tool.setWielderId(-1);
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