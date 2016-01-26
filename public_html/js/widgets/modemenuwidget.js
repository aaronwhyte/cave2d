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

  this.itemColor = new Vec4(1, 1, 1, 1);
  this.indicatorColor = new Vec4(1, 1, 1, 1);

  // for interpreting keypresses. Index is group num, value is key name.
  this.groupKeyNames = [];

  // for drawing keyboard shortcuts
  this.groupNumToKeyStamp = [];

  this.matrixesValid = false;

  // single stamp for the entire set of items
  this.menuStamp = null;
  this.menuMatrix = new Matrix44();
  this.menuColor = new Vec4(1, 1, 1, 1);

  // selection indicator, like a box around the selection
  this.indicatorStamp = null;
  this.indicatorMatrix = new Matrix44();
  this.indicatorColor = new Vec4(1, 1, 1, 1);

  // keyboard tips, for people who like that sort of thing
  this.keyTipsStamp = null;
  this.keyTipsMatrix = new Matrix44();
  this.keyTipsColor = new Vec4(1, 1, 1, 1);

  // center of the group-0, rank-0 item
  this.menuPos = new Vec2d(0, 0);

  // transform from group to group
  this.groupOffset = new Vec2d();

  // transform from rank to rank
  this.rankOffset = new Vec2d();

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
}

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

ModeMenuWidget.prototype.setPosition = function(pos) {
  if (!this.menuPos.equals(pos)) {
    this.menuPos.set(pos);
    this.invalidateMatrixes();
  }
  return this;
};

ModeMenuWidget.prototype.setGridOffsets = function(groupOffset, rankOffset) {
  if (!this.groupOffset.equals(groupOffset) || !this.rankOffset.equals(rankOffset)) {
    this.groupOffset.set(groupOffset);
    this.rankOffset.set(rankOffset);
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
        .setColorVector(this.itemColor)
        .setStamp(this.menuStamp)
        .setModelMatrix(this.menuMatrix)
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
  this.menuStamp = null;
  this.keyTipsStamp = null;
  // indicator stamp is unaffected
};

ModeMenuWidget.prototype.validateStamps = function(gl) {
  if (!this.menuStamp) {
    var menuModel = new RigidModel();
    var groupOffset = Vec2d.alloc();
    var rankOffset = Vec2d.alloc();
    var totalOffset = Vec2d.alloc();
    for (var g = 0; g < this.groups.length; g++) {
      var group = this.groups[g];
      for (var r = 0; r < group.length; r++) {
        var item = group[r];
        groupOffset.set(this.groupOffset).scale(g);
        rankOffset.set(this.rankOffset).scale(r);
        totalOffset.set(groupOffset).add(rankOffset);
        var itemModel = new RigidModel()
            .addRigidModel(item.model)
            .transformPositions(this.mat44.toScaleOpXYZ(this.itemScale.x, this.itemScale.y, 0))
            .transformPositions(this.mat44.toTranslateOpXYZ(totalOffset.x, totalOffset.y, 0));
        menuModel.addRigidModel(itemModel);
      }
    }
    this.menuStamp = menuModel.createModelStamp(gl);
  }

  if (!this.keyTipsStamp) {
    // TODO key tip stamp
  }
};

ModeMenuWidget.prototype.validateMatrixes = function() {
  if (this.matrixesValid) return;
  this.menuMatrix.toTranslateOpXYZ(this.menuPos.x, this.menuPos.y, -0.9);
  this.matrixesValid = true;
};

////////////////////
// Event handling //
////////////////////

ModeMenuWidget.prototype.addKeyboardShortcut = function(groupNum, keyName) {
  this.groupKeyNames[groupNum] = keyName;
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

ModeMenuWidget.prototype.startListening = function() {
  this.trigger.startListening();
  // TODO keything
  return this;
};

ModeMenuWidget.prototype.stopListening = function() {
  this.trigger.stopListening();
  // TODO keything
  return this;
};


