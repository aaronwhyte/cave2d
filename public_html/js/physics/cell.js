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
      this.groups[i] = {};
    } else {
      var group = this.groups[i];
      for (var key in group) {
        if (group.hasOwnProperty(key)) {
          delete group[key];
        }
      }
    }
  }
  this.groups.length = groupCount;
};

Poolify(Cell);

Cell.prototype.addPathIdToGroup = function(pathId, groupId) {
  var group = this.groups[groupId];
  group[pathId] = true;
};

Cell.prototype.removePathIdFromGroup = function(pathId, groupId) {
  var group = this.groups[groupId];
  delete group[pathId];
};

/**
 * Returns a map from pathId to boolean "true", to avoid re-formatting overhead.
 * @param groupId
 * @returns {Object}
 */
Cell.prototype.getPathIdSetForGroup = function(groupId) {
  return this.groups[groupId];
};
