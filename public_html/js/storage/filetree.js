/**
 * Stores key/value pairs, where keys are arrays of strings, and values are JSON.
 * @param {StorageLike} storageLike
 * @constructor
 */
function FileTree(storageLike) {
  this.s = storageLike;
}

FileTree.prototype.pathString = function(pathArray) {
  if (!Array.isArray(pathArray)) {
    throw 'path is not array: ' + JSON.stringify(pathArray);
  }
  for (var i = 0; i < pathArray.length; i++) {
    if (typeof pathArray[i] != 'string') {
      throw 'element ' + i + ' is not string in path' + JSON.stringify(pathArray);
    }
  }
  return JSON.stringify(pathArray);
};

FileTree.prototype.setFile = function(pathArray, jsonVal) {
  this.s.set(this.pathString(pathArray), JSON.stringify(jsonVal));
};

FileTree.prototype.getFile = function(pathArray) {
  return JSON.parse(this.s.get(this.pathString(pathArray)));
};

FileTree.prototype.isFile = function(pathArray) {
  return this.s.get(this.pathString(pathArray)) != null;
};

FileTree.prototype.hasDescendants = function(pathArray) {
  var keyStrings = this.s.keys();
  for (var i = 0; i < keyStrings.length; i++) {
    if (this.isAncestorOf(pathArray, JSON.parse(keyStrings[i]))) return true;
  }
  return false;
};

/**
 * Lists all file paths (not file-less path fragments) below this path, not including this path.
 */
FileTree.prototype.listDescendants = function(pathArray) {
  var retval = [];
  var keyStrings = this.s.keys();
  for (var i = 0; i < keyStrings.length; i++) {
    var keyArray = JSON.parse(keyStrings[i]);
    if (this.isAncestorOf(pathArray, keyArray)) retval.push(keyArray);
  }
  return retval;
};

/**
 * Lists all paths directly below this path, including files and the fragments of the paths of deeper files.
 * It's like "ls" in Unix-like systems, or "dir" in Windows.
 * @param {Array.<String>} pathArray
 * @return {Array.<String>}
 */
FileTree.prototype.listChildren = function(pathArray) {
  var retval = [];
  var foundSet = new ObjSet();
  var keyStrings = this.s.keys();
  for (var i = 0; i < keyStrings.length; i++) {
    var keyArray = JSON.parse(keyStrings[i]);
    var fragment = keyArray[pathArray.length];
    if (!foundSet.contains(fragment) &&
        this.isAncestorOf(pathArray, keyArray)) {
      retval.push(keyArray[pathArray.length]);
      foundSet.put(fragment);
    }
  }
  return retval;
};

/**
 * Copies one file.
 * @param {Array.<String>} fromPath
 * @param {Array.<String>} toPath
 * @returns {boolean} true if fromPath is a file (and therefore the file was copied), false otherwise
 */
FileTree.prototype.copyFile = function(fromPath, toPath) {
  if (this.isFile(fromPath)) {
    var file = this.getFile(fromPath);
    this.setFile(toPath, file);
    return true;
  }
  return false;
};

/**
 * Deletes one file.
 * @param {Array.<String>} path
 * @returns {boolean} true if 'path' points to a file (and therefore the file was deleted), false otherwise
 */
FileTree.prototype.deleteFile = function(path) {
  if (this.isFile(path)) {
    this.s.remove(this.pathString(path));
    return true;
  }
  return false;
};

/**
 * Moves one file.
 * @param {Array.<String>} fromPath
 * @param {Array.<String>} toPath
 * @returns {boolean} true if fromPath is a file (and therefore the file was moved), false otherwise
 */
FileTree.prototype.moveFile = function(fromPath, toPath) {
  if (this.isFile(fromPath)) {
    var file = this.getFile(fromPath);
    // Delete before setting, in the dumb case where the file is being moved to itself.
    this.deleteFile(fromPath);
    this.setFile(toPath, file);
    return true;
  }
  return false;
};

/**
 * Copies all files with paths starting with fromPath, longer than fromPath
 * @param {Array.<String>} fromPath
 * @param {Array.<String>} toPath
 * @returns {boolean} true if there was any file under fromPath, and therefore something was copied
 */
FileTree.prototype.copyDescendants = function(fromPath, toPath) {
  var paths = this.listDescendants(fromPath);
  if (!paths.length) return false;
  // copy all vals (as strings) into memory first, in case any destination paths overlap source paths
  var vals = [];
  for (var i = 0; i < paths.length; i++) {
    vals.push(this.s.get(this.pathString(paths[i])));
  }
  // write into the new locations
  for (var i = 0; i < paths.length; i++) {
    var newPath = toPath.concat(paths[i].slice(fromPath.length));
    this.s.set(this.pathString(newPath), vals[i]);
  }
  return true;
};

/**
 * Deletes all files with paths starting with fromPath, longer than fromPath
 * @param {Array.<String>} path
 * @returns {boolean} true if there was any file under path, and therefore something was deleted
 */
FileTree.prototype.deleteDescendants = function(path) {
  var paths = this.listDescendants(path);
  if (!paths.length) return false;
  for (var i = 0; i < paths.length; i++) {
    this.s.remove(this.pathString(paths[i]));
  }
  return true;
};

/**
 * Moves all files with paths starting with fromPath, longer than fromPath
 * @param {Array.<String>} fromPath
 * @param {Array.<String>} toPath
 * @returns {boolean} true if there was any file under fromPath, and therefore something was moved
 */
FileTree.prototype.moveDescendants = function(fromPath, toPath) {
  var paths = this.listDescendants(fromPath);
  if (!paths.length) return false;
  // Copy all vals (as strings) into memory first, in case any destination paths overlap source paths.
  var vals = [];
  for (var i = 0; i < paths.length; i++) {
    vals.push(this.s.get(this.pathString(paths[i])));
  }
  // delete from old locations
  for (var i = 0; i < paths.length; i++) {
    this.s.remove(this.pathString(paths[i]));
  }
  // write into the new locations
  for (var i = 0; i < paths.length; i++) {
    var newPath = toPath.concat(paths[i].slice(fromPath.length));
    this.s.set(this.pathString(newPath), vals[i]);
  }
  return true;
};



FileTree.prototype.isAncestorOf = function(ancestorArray, checkPathArray) {
  if (checkPathArray.length <= ancestorArray.length) return false;
  if (ancestorArray.length == 0) return true;
  for (var seg = 0; seg < ancestorArray.length; seg++) {
    if (ancestorArray[seg] != checkPathArray[seg]) {
      return false;
    }
  }
  return true;
};