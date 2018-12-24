/**
 * An on-screen menu grid that supports touch, the mouse pointer, and keyboard keys.
 * Items are organized into an ordered list of groups, and within each group they are ordered by rank.
 * @param {Element} elem  DOM element to listen to
 * @constructor
 */
function ModeMenuWidget(elem) {
  this.elem = elem;

  // Array of rank-arrays of items.
  this.groups = [];

  this.mat44 = new Matrix44();

  // for interpreting keypresses.
  this.keyNameToGroup = {};

  // for drawing keyboard shortcuts
  this.groupNumToKeyStamp = [];

  this.matrixesValid = false;
  this.stampsValid = false;

  let alpha = 0.9;

  // single stamp for the entire set of items
  this.menuStamp = null;
  this.menuMatrix = new Matrix44();
  this.menuColor = new Vec4(1, 1, 1, alpha);

  // selection indicator, like a box around the selection
  this.indicatorStamp = null;
  this.indicatorMatrix = new Matrix44();
  this.indicatorColor = new Vec4(1, 1, 1, alpha);

  // keyboard tips, for people who like that sort of thing
  this.keyTipsStamp = null;
  this.keyTipsMatrix = new Matrix44();
  this.keyTipsColor = new Vec4(1, 1, 1, alpha);

  // center of the group-0, rank-0 item
  this.menuPos = new Vec2d(0, 0);

  this.itemPosMatrix = new Matrix44();
  this.inverseItemPosMatrix = new Matrix44();

  // scale to apply to individual items
  this.itemScale = new Vec2d(1, -1);

  // time after which the keyboard tips will stop being rendered
  this.keyTipsUntilTimeMs = -Infinity;

  // what is selected?
  this.selectedGroup = 0;
  this.selectedRank = 0;

  this.keys = new Keys();

  let self = this;
  this.keyDownListener = function(e) {
    if (!e) e = window.event;
    let keyName = self.keys.getNameForKeyCode(e.keyCode);
    if (keyName in self.keyNameToGroup) {
      let newGroup = self.keyNameToGroup[keyName];
      let newRank = self.selectedRank;
      if (newGroup === self.selectedGroup) {
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
    let touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      let touch = touches[i];
      if (self.maybeSelectPageXY(touch.pageX, touch.pageY)) {
        // for layer thing
        return false;
      }
    }
  };
  this.mouseDownListener = function(e) {
    if (!e) e = window.event;
    if (self.maybeSelectPageXY(e.clientX, e.clientY)) {
      // for layer thing
      return false;
    }
  };
}

////////////
// Public //
////////////

ModeMenuWidget.prototype.setItem = function(group, rank, name, model) {
  if (!this.groups[group]) this.groups[group] = [];
  this.groups[group][rank] = {
    name: name,
    model: model
  };
  return this;
};

ModeMenuWidget.prototype.addKeyboardShortcut = function(groupNum, keyName) {
  this.keyNameToGroup[keyName] = groupNum;
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

/**
 * Set the position of the zero-group, zero-rank item
 * @param {Vec2d} pos
 * @returns {ModeMenuWidget}
 */
ModeMenuWidget.prototype.setPosition = function(pos) {
  if (!this.menuPos.equals(pos)) {
    this.menuPos.set(pos);
    this.invalidateMatrixes();
  }
  return this;
};

/**
 * Sets the matrix for transforming an item <group. rank> to a
 * screen-offset for the center of that item, relative to the menu position.
 * This is also used to calculate the selection-indicator position.
 * @param {Matrix44} m
 * @returns {ModeMenuWidget}
 */
ModeMenuWidget.prototype.setItemPositionMatrix = function(m) {
  if (!this.itemPosMatrix.equals(m)) {
    this.itemPosMatrix.set(m);
    this.itemPosMatrix.getInverse(this.inverseItemPosMatrix);
    this.invalidateStamps();
    this.invalidateMatrixes();
  }
  return this;
};

/**
 * Used to help draw an item stamp, after the item position has been computed.
 * @param {Vec2d} scale
 * @returns {ModeMenuWidget}
 */
ModeMenuWidget.prototype.setItemScale = function(scale) {
  if (!this.itemScale.equals(scale)) {
    this.itemScale.set(scale);
    this.invalidateStamps();
  }
  return this;
};

/**
 * Stamp for the selection indicator.
 * @param {ModelStamp} stamp
 * @returns {ModeMenuWidget}
 */
ModeMenuWidget.prototype.setIndicatorStamp = function(stamp) {
  this.indicatorStamp = stamp;
  return this;
};

ModeMenuWidget.prototype.startListening = function() {
  document.addEventListener('keydown', this.keyDownListener);
  this.elem.addEventListener('touchstart', this.touchStartListener);
  this.elem.addEventListener('mousedown', this.mouseDownListener);
  return this;
};

ModeMenuWidget.prototype.stopListening = function() {
  document.removeEventListener('keydown', this.keyDownListener);
  this.elem.removeEventListener('touchstart', this.touchStartListener);
  this.elem.removeEventListener('mousedown', this.mouseDownListener);
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
  if (this.indicatorStamp && this.getSelectedName()) {
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

ModeMenuWidget.prototype.getSelectedName = function() {
  let g = this.groups[this.selectedGroup];
  let r = g && g[this.selectedRank];
  return r && r.name;
};

ModeMenuWidget.prototype.getMaxGroupNum = function() {
  return this.groups.length;
};


/////////////
// Private //
/////////////

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
    let menuModel = new RigidModel();
    let itemOffset = Vec4.alloc();
    for (let g = 0; g < this.groups.length; g++) {
      let group = this.groups[g];
      for (let r = 0; r < group.length; r++) {
        let item = group[r];
        this.getItemOffset(g, r, itemOffset);
        let itemModel = new RigidModel()
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
  let indicatorOffset = this.getItemOffset(this.selectedGroup, this.selectedRank, Vec4.alloc());
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
  vec4Out.transform(this.itemPosMatrix);
  return vec4Out;
};

ModeMenuWidget.prototype.maybeSelectPageXY = function(pageX, pageY) {
  let selected = false;
  let pos = Vec4.alloc().setXYZ(pageX - this.menuPos.x, pageY - this.menuPos.y, 0);
  pos.transform(this.inverseItemPosMatrix);
  let group = Math.round(pos.getX());
  let rank = Math.round(pos.getY());
  if (this.groups[group] && this.groups[group][rank]) {
    this.setSelectedGroupAndRank(group, rank);
    selected = true;
  }
  pos.free();
  return selected;
};

ModeMenuWidget.prototype.setSelectedGroupAndRank = function(group, rank) {
  if (this.selectedGroup != group || this.selectedRank != rank) {
    this.selectedGroup = group;
    this.selectedRank = rank;
    this.invalidateMatrixes();
  }
};

