/**
 * Stack of saved game states, for helping with undo and redo.
 * @param maxSize
 * @constructor
 */
function UndoStack(maxSize) {
  this.maxSize = maxSize;
  this.queue = new CircularQueue(maxSize);

  // 0 means the user has not done an undo, and there's no redo to do.
  // At 0, the top of the stack (if there is anything represents) the last saved world state, plus
  // the view from which the user can see at the thing that changes.
  // 1 means the user did one undo, so a redo will apply state 0, and another undo will go to state 2.
  // When the user saves another change, every state from undoDepth-1 and lower will be deleted
  this.depth = -1;
}

// depthOffset values
UndoStack.UNDO = 1;
UndoStack.REDO = -1;

UndoStack.prototype.save = function(world, view) {
  // Pop all the redo records off, then push the new one on.
  // Saving while at non-zero depth destroys the old future. Typical time-travel rules. Me am play gods!
  for (var i = 1; i < this.depth; i++) {
    this.queue.pop();
  }
  this.queue.enqueue(new UndoEntry(world, view));
  this.depth = 0;
};

/**
 * @param depthOffset UndoStack.UNDO or UndoStack.REDO
 * @returns {boolean} true if the depth + depthOffset is in bounds
 */
UndoStack.prototype.hasEntryAtOffset = function(depthOffset) {
  var d = this.depth + depthOffset;
  return d >=0 && d < this.queue.size();
};

/**
 * @param depthOffset UndoStack.UNDO or UndoStack.REDO
 * @return a view, or throws an error if out of bounds
 */
UndoStack.prototype.getViewAtOffset = function(depthOffset) {
  return this.queue.getFromHead(this.depth + depthOffset).view;
};

/**
 * If the is a world at the offset+depth, then this updates the depth and returns the world.
 * @param depthOffset UndoStack.UNDO or UndoStack.REDO
 * @return a world, or throws an error if out of bounds
 */
UndoStack.prototype.selectWorld = function(depthOffset) {
  var world = this.queue.getFromHead(this.depth + depthOffset).world;
  this.depth += depthOffset;
  return world;
};