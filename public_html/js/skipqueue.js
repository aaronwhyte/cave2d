/**
 * A SkipQueue priority queue, ordered by time.
 * Nodes must have a "time" value, and a "next" array.
 * @constructor
 */
function SkipQueue(base, maxLevel) {
  this.base = base;
  this.maxLevel = maxLevel;
  this.levelUpOdds = 1 / this.base;

  this.level = this.maxLevel;
  this.next = [];
  this.size = 0;  
  this.prevs = [];
}

SkipQueue.getRecommendedMaxLevel = function(expectedLength, base) {
  return Math.ceil(Math.log(expectedLength) / Math.log(base));
};

SkipQueue.prototype.randomLevel = function() {
  var level = 0;
  var rand = Math.random();
  var bar = this.levelUpOdds;
  while (rand < bar && level < this.maxLevel) {
    level++;
    bar *= this.levelUpOdds;
  }
  return level;
};

/**
 * Add a node, in the right order.
 * @param {Object} addMe
 */
SkipQueue.prototype.add = function(addMe) {
  var prevs = this.prevs;
  addMe.level = this.randomLevel();
  
  // set up for traversal
  var node = this;

  var next;
  for (var level = this.maxLevel; level >= 0; --level) {
    // right
    next = node.next[level];
    while (next && next.time < addMe.time) {
      node = next;
      next = node.next[level];
    }
    prevs[level] = node;
  }
  // For the levels that this node blocks, do inserts.
  for (level = addMe.level; level >= 0; --level) {
    addMe.next[level] = prevs[level].next[level];
    prevs[level].next[level] = addMe;
  }
  this.size++;
};

/**
 * Returns the first node, or null if empty, and also removes it.
 */
SkipQueue.prototype.removeFirst = function() {
  var node = this.next[0];
  if (!node) return null;
  for (var level = node.level; level >= 0; --level) {
    this.next[level] = node.next[level];
  }
  this.size--;
  return node;
};

SkipQueue.prototype.clear = function() {
  while(this.removeFirst()){};
};

/**
 * Returns the first node without removing it.
 */
SkipQueue.prototype.getFirst = function() {
  return this.next[0];
};

SkipQueue.prototype.toString = function() {
  var node = this.next[0];
  var out = [];
  while (node != null) {
    out.push(node.toString());
    node = node.next[0];
  }
  return '[' + out.join(',\n') + ']';
};