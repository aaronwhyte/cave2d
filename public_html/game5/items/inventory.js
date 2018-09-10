/**
 * List of items. The 0th one is the one that is selected.
 * @constructor
 */
function Inventory() {
 this.items = [];
}

/**
 * Removes the item at the index, and shifts higher-numbered items to the left.
 * @param index
 */
Inventory.prototype.remove = function(index) {
  if (index < 0 || index >= this.items.length) {
    console.warn("ignoring bad index:", index);
  } else {
    this.items.splice(index, 1);
  }
};

/**
 * Moves the item at the selected index to the 0th index,
 * and moves everything in between to the right by 1.
 * @param index
 */
Inventory.prototype.select = function(index) {
  if (index < 0 || index >= this.items.length) {
    console.warn("ignoring bad index:", index);
  } else {
    let selectedItem = this.items[index];
    for (let i = index; i > 0; i--) {
      this.items[i] = this.items[i - 1];
    }
    this.items[0] = selectedItem;
  }
};

/**
 * Moves the item at the selected index to the 0th index,
 * and moves everything in between to the right by 1.
 * @param item
 * @param {number=} opt_index
 */
Inventory.prototype.add = function(item, opt_index) {
  let index = opt_index || 0;
  if (index < 0 || index > this.items.length) {
    console.warn("ignoring bad index:", index);
  } else if (!item) {
    console.warn("ignoring falsy item:", item);
  } else {
    this.items.splice(index, 0, item);
  }
};

/**
 * Moves the item at the selected index to the 0th index,
 * and moves everything in between to the right by 1.
 * @param {number} index
 * @return item, or null if the index is invalid
 */
Inventory.prototype.get = function(index) {
  if (index < 0 || index >= this.items.length) {
    console.warn("ignoring bad index:", index);
    return null;
  } else {
    return this.items[index];
  }
};

/**
 * @return {number}
 */
Inventory.prototype.size = function() {
  return this.items.length;
};
