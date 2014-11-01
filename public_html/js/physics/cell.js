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
      this.groups[i] = ArraySet.alloc();
    } else {
      this.groups[i].reset();
    }
  }
  while (this.groups.length > groupCount) {
    this.groups.pop().free();
  }
};

Poolify(Cell);

Cell.prototype.addPathIdToGroup = function(pathId, groupId) {
  this.groups[groupId].put(pathId);
};

Cell.prototype.removePathIdFromGroup = function(pathId, groupId) {
  this.groups[groupId].remove(pathId);
};

/**
 * Returns the internal ArraySet.
 * @param groupId
 * @returns {ArraySet}
 */
Cell.prototype.getPathIdsForGroup = function(groupId) {
  return this.groups[groupId];
};

Cell.prototype.isEmpty = function() {
  for (var i = 0; i < this.groups.length; i++) {
    if (!this.groups[i].isEmpty()) {
      return false;
    }
  }
  return true;
};
