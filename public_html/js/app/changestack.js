/**
 * Stack of groups of reversible changes, for helping with undo and redo.
 * @param maxSize
 * @constructor
 */
function ChangeStack(maxSize) {
  this.maxSize = maxSize;
  this.queue = new CircularQueue(maxSize);

  // 0 means the user has not done an undo, and there's no redo to do.
  // At 0, the top of the stack (if there is anything represents) the last saved world state, plus
  // the view from which the user can see at the thing that changes.
  // 1 means the user did one undo, so a redo will apply state 0, and another undo will go to state 2.
  // When the user saves another change, every state from undoDepth-1 and lower will be deleted
  this.depth = -1;
}

// direction values
ChangeStack.UNDO = 1;
ChangeStack.REDO = -1;

ChangeStack.prototype.save = function(changes) {
  // Pop all the redo records off, then push the new one on.
  // Saving while at non-zero depth destroys the old future. Typical time-travel rules. Me am play gods!
  for (let i = 0; i < this.depth; i++) {
    this.queue.pop();
  }
  this.queue.enqueue(changes);
  this.depth = 0;
};

ChangeStack.prototype.hasUndo = function() {
  return this.queue.size() > 0 && this.depth < this.queue.size();
};

ChangeStack.prototype.hasRedo = function() {
  return this.depth + ChangeStack.REDO >=0;
};

ChangeStack.prototype.selectUndo = function() {
  if (!this.hasUndo()) throw new Error('no undo data. check hasUndo()');
  let changes = this.queue.getFromHead(this.depth);
  let reverse = [];
  for (let i = changes.length - 1; i >= 0; i--) {
    reverse.push(changes[i].createReverse());
  }
  this.depth += ChangeStack.UNDO;
  return reverse;
};

ChangeStack.prototype.selectRedo = function() {
  if (!this.hasRedo()) throw new Error('no redo data. check hasRedo()');
  this.depth += ChangeStack.REDO;
  return this.queue.getFromHead(this.depth);
};
