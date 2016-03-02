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

//- copyFile(fromPath, toPath) overwrites
//- deleteFile(path)
//- moveFile(fromPath, toPath) // what if fromPath == toPath?
//- tests
//- dir ops?
//    - copyTree(fromPath, toPath) overwrites? What if one is a prefix? need temp copy?
//    - deleteTree(path)
//    - moveTree(fromPath, toPath) // what if one is a prefix of the other? need temp copy?
//    - tests

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