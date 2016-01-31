/**
 * An on-scren menu grid that supports touch, the mouse pointer, and keyboard keys.
 * Items are organized into an ordered list of groups, and within each group they are ordered by rank.
 * @param {Element} elem  DOM element to listen to
 * @param {Glyphs} glyphs from which to draw keyboard shortcut models
 * @constructor
 */
function ModeMenuWidget(elem, glyphs) {
  this.elem = elem;
  this.glyphs = glyphs;

  // Array of rank-arrays of items.
  this.groups = [];

  this.mat44 = new Matrix44();

  // for interpreting keypresses.
  this.keyNameToGroup = {};

  // for drawing keyboard shortcuts
  this.groupNumToKeyStamp = [];

  this.matrixesValid = false;
  this.stampsValid = false;

  // single stamp for the entire set of items
  this.menuStamp = null;
  this.menuMatrix = new Matrix44();
  this.menuColor = new Vec4(1, 1, 1, 0.5);

  // selection indicator, like a box around the selection
  this.indicatorStamp = null;
  this.indicatorMatrix = new Matrix44();
  this.indicatorColor = new Vec4(1, 1, 1, 0.6);

  // keyboard tips, for people who like that sort of thing
  this.keyTipsStamp = null;
  this.keyTipsMatrix = new Matrix44();
  this.keyTipsColor = new Vec4(1, 1, 1, 0.5);

  // center of the group-0, rank-0 item
  this.menuPos = new Vec2d(0, 0);

  this.itemPositionMatrix = new Matrix44();

  // How to map from page coords to (group, rank) coords.
  this.pageToItemMatrix = new Matrix44();

  // scale to apply to individual items
  this.itemScale = new Vec2d(1, -1);

  // scale to apply to keyboard tips
  this.keyTipsScale = new Vec2d(0.5, -0.5);

  // scale to apply to keyboard tips
  this.keyTipsOffset = new Vec2d(0, -1);

  // time after which the keyboard tips will stop being rendered
  this.keyTipsUntilTimeMs = -Infinity;

  // what is selected?
  this.selectedGroup = 0;
  this.selectedRank = 0;

  this.keys = new Keys();

  var self = this;
  this.keyDownListener = function(e) {
    if (!e) e = window.event;
    var keyName = self.keys.getNameForKeyCode(e.keyCode);
    if (keyName in self.keyNameToGroup) {
      var newGroup = self.keyNameToGroup[keyName];
      var newRank = self.selectedRank;
      if (newGroup == self.selectedGroup) {
        // advance rank
        newRank = (newRank + 1) % self.groups[newGroup].length;
      } else {
        newRank = 0;
      }
      self.setSelectedGroupAndRank(newGroup, newRank);
    }
  };
  this.touchStartListener = function(e) {
    if (!e) e = window.event;
    var touches = e.changedTouches;
    for (var i = 0; i < touches.length; i++) {
      var touch = touches[i];
      if (self.maybeSelectPageXY(touch.pageX, touch.pageY)) {
        // for layer thing
        return false;
      }
    }
  };
}

ModeMenuWidget.prototype.maybeSelectPageXY = function(pageX, pageY) {
  var retval = false;
//  var coords = Vec2d.alloc();
//  coords.set(this.menuPos).addXY(pageX, pageY);
//  coords.add(groupOffset
//  coords.free();
  return retval;
};


ModeMenuWidget.prototype.setSelectedGroupAndRank = function(group, rank) {
  if (this.selectedGroup != group || this.selectedRank != rank) {
    this.selectedGroup = group;
    this.selectedRank = rank;
    this.invalidateMatrixes();
  }
};

///////////////
// Rendering //
///////////////

ModeMenuWidget.prototype.setItem = function(group, rank, name, model) {
  if (!this.groups[group]) this.groups[group] = [];
  this.groups[group][rank] = {
    name: name,
    model: model
  };
  return this;
};

/**
 * Set the position of the zero-group, zero-rank item
 * @param pos
 * @returns {ModeMenuWidget}
 */
ModeMenuWidget.prototype.setPosition = function(pos) {
  if (!this.menuPos.equals(pos)) {
    this.menuPos.set(pos);
    this.invalidateMatrixes();
  }
  return this;
};

ModeMenuWidget.prototype.setItemPositionMatrix = function(m) {
  if (!this.itemPositionMatrix.equals(m)) {
    this.itemPositionMatrix.set(m);
    this.invalidateStamps();
  }
  return this;
};

ModeMenuWidget.prototype.setItemScale = function(scale) {
  if (!this.itemScale.equals(scale)) {
    this.itemScale.set(scale);
    this.invalidateStamps();
  }
  return this;
};

ModeMenuWidget.prototype.setIndicatorStamp = function(stamp) {
  this.indicatorStamp = stamp;
  return this;
};

ModeMenuWidget.prototype.draw = function(renderer) {
  this.validateStamps(renderer.gl);
  this.validateMatrixes();

  if (this.menuStamp) {
    renderer
        .setColorVector(this.menuColor)
        .setStamp(this.menuStamp)
        .setModelMatrix(this.menuMatrix)
        .drawStamp();
  }
  if (this.indicatorStamp) {
    renderer
        .setColorVector(this.indicatorColor)
        .setStamp(this.indicatorStamp)
        .setModelMatrix(this.indicatorMatrix)
        .drawStamp();
  }
  if (Date.now() < this.keyTipsUntilTimeMs && this.keyTipsStamp) {
    renderer
        .setColorVector(this.keyTipsColor)
        .setStamp(this.keyTipsStamp)
        .setModelMatrix(this.keyTipsMatrix)
        .drawStamp();
  }
  return this;
};

ModeMenuWidget.prototype.invalidateMatrixes = function() {
  this.matrixesValid = false;
};

ModeMenuWidget.prototype.invalidateStamps = function() {
  this.stampsValid = false;
  // indicator stamp is unaffected
};

ModeMenuWidget.prototype.validateStamps = function(gl) {
  if (!this.stampsValid) {
    if (this.menuStamp) {
      this.menuStamp.dispose(gl);
    }
    this.menuStamp = null;

    if (this.keyTipsStamp) {
      this.keyTipsStamp.dispose(gl);
    }
    this.keyTipsStamp = null;
  }
  if (!this.menuStamp) {
    var menuModel = new RigidModel();
    var itemOffset = Vec4.alloc();
    for (var g = 0; g < this.groups.length; g++) {
      var group = this.groups[g];
      for (var r = 0; r < group.length; r++) {
        var item = group[r];
        this.getItemOffset(g, r, itemOffset);
        var itemModel = new RigidModel()
            .addRigidModel(item.model)
            .transformPositions(this.mat44.toScaleOpXYZ(this.itemScale.x, this.itemScale.y, 1))
            .transformPositions(this.mat44.toTranslateOpXYZ(itemOffset.getX(), itemOffset.getY(), 0));
        menuModel.addRigidModel(itemModel);
      }
    }
    itemOffset.free();
    this.menuStamp = menuModel.createModelStamp(gl);
  }

  if (!this.keyTipsStamp) {
    // TODO key tip stamp
  }
  this.stampsValid = true;
};

ModeMenuWidget.prototype.validateMatrixes = function() {
  if (this.matrixesValid) return;
  this.menuMatrix.toTranslateOpXYZ(this.menuPos.x, this.menuPos.y, -0.9);
  var indicatorOffset = this.getItemOffset(this.selectedGroup, this.selectedRank, Vec4.alloc());
  this.indicatorMatrix.toIdentity()
      .multiply(this.mat44.toTranslateOpXYZ(
          this.menuPos.x + indicatorOffset.getX(),
          this.menuPos.y + indicatorOffset.getY(),
          -0.9))
      .multiply(this.mat44.toScaleOpXYZ(this.itemScale.x, this.itemScale.y, 1));
  this.matrixesValid = true;
  indicatorOffset.free();
};

ModeMenuWidget.prototype.getItemOffset = function(group, rank, vec4Out) {
  vec4Out.setXYZ(group, rank, 0);
  vec4Out.transform(this.itemPositionMatrix);
  return vec4Out;
};

////////////////////
// Event handling //
////////////////////

ModeMenuWidget.prototype.startListening = function() {
  document.addEventListener('keydown', this.keyDownListener);
  return this;
};

ModeMenuWidget.prototype.stopListening = function() {
  document.removeEventListener('keydown', this.keyDownListener);
  return this;
};

ModeMenuWidget.prototype.addKeyboardShortcut = function(groupNum, keyName) {
  this.keyNameToGroup[keyName] = groupNum;
  return this;
};

ModeMenuWidget.prototype.listenToTouch = function() {
  if (!this.touchTrigger) {
    this.touchTrigger = new TouchTrigger(this.elem).startListening();
    this.trigger.addTrigger(this.touchTrigger);
    // TODO startzone
  }
  return this;
};

ModeMenuWidget.prototype.listenToMousePointer = function() {
  if (!this.mousePointerTrigger) {
    this.mousePointerTrigger = new MousePointerTrigger(this.elem).startListening();
    this.trigger.addTrigger(this.mousePointerTrigger);
    // TODO startzone
  }
  return this;
};

/**
 * Sets the absolute time, in ms, at which the keyboard tip will stop being rendered.
 * @param {Number} timeMs
 */
ModeMenuWidget.prototype.setKeyboardTipTimeoutMs = function(timeMs) {
  this.keyTipsUntilTimeMs = timeMs;
  return this;
};
