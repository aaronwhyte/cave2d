/**
 * A world grid cell, holding pathIds by hitGroup.
 * It is a compact array of groups, indexed by hitGroup number.
 * Each group is a set of pathIds.
 * @constructor
 */
function Cell(groupCount) {
  this.groups = [];
  this.reset(groupCount);
}

Cell.prototype.reset = function(groupCount) {
  for (var i = 0; i < groupCount; i++) {
    if (!this.groups[i]) {
      this.groups[i] = new Set();
    } else {
      this.groups[i].clear();
    }
  }
  while (this.groups.length > groupCount) {
    this.groups.pop();
  }
};

Poolify(Cell);

Cell.prototype.addPathIdToGroup = function(pathId, groupId) {
  this.groups[groupId].add(pathId);
};

Cell.prototype.removePathIdFromGroup = function(pathId, groupId) {
  this.groups[groupId].delete(pathId);
};

/**
 * Returns the internal Set.
 * @param groupId
 * @returns {Set}
 */
Cell.prototype.getPathIdsForGroup = function(groupId) {
  return this.groups[groupId];
};

Cell.prototype.isEmpty = function() {
  for (var i = 0; i < this.groups.length; i++) {
    if (this.groups[i].size) {
      return false;
    }
  }
  return true;
};
