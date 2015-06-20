/**
 * Adds clickable buttons to the world and the GL.
 * @param labelMaker
 * @param world
 * @param multiPointer
 * @param renderer
 * @constructor
 */
function ButtonMaker(labelMaker, world, multiPointer, renderer) {
  this.labelMaker = labelMaker;
  this.world = world;
  this.multiPointer = multiPointer;
  this.renderer = renderer;

  this.startMatrix = new Matrix44();
  this.nextCharMatrix = new Matrix44().toTranslateOpXYZ(3, 0, 0);
  this.letterColor = [1, 1, 1];
  this.blockColor = [0.5, 0.5, 0.5];
  this.padding = new Vec2d(0.5, 0.5);

  this.scale = 1;
}

/**
 * @param {Matrix44} m
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setStartMatrix = function(m) {
  this.startMatrix = m;
  return this;
};

/**
 * @param {Matrix44} m
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setNextCharMatrix = function(m) {
  this.nextCharMatrix = m;
  return this;
};

/**
 * @param {Array.<number>} c
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setLetterColor = function(c) {
  this.letterColor = c;
  return this;
};

/**
 * @param {Array.<number>} c
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setBlockColor = function(c) {
  this.blockColor = c;
  return this;
};

/**
 * @param {number} x
 * @param {number} y
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setPaddingXY = function(x, y) {
  this.padding.setXY(x, y);
  return this;
};

/**
 * @param {number} s
 * @returns {ButtonMaker}
 */
ButtonMaker.prototype.setScale = function(s) {
  this.scale = s;
  return this;
};

/**
 * Adds a button body and spirit to the world, and a button model to GL.
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {function} func or null for no callback
 * @return {number} The ID of the spirit added to the world.
 */
ButtonMaker.prototype.addButton = function(x, y, text, func) {
  var labelModel = this.labelMaker.createLabelModel(this.startMatrix, this.nextCharMatrix, text);
  labelModel.transformPositions(new Matrix44().toScaleOpXYZ(this.scale, this.scale, this.scale));
  var brect = labelModel.getBoundingRect();
  if (this.padding) {
    brect.padXY(this.padding.x, this.padding.y);
  }
  labelModel.transformPositions(new Matrix44().toTranslateOpXYZ(-brect.pos.x, -brect.pos.y, 0));
  for (var i = 0; i < labelModel.vertexes.length; i++) {
    labelModel.vertexes[i].setColorArray(this.letterColor);
  }

  if (this.blockColor) {
    var cuboid = RigidModel.createCube();
    cuboid.transformPositions(new Matrix44().toScaleOpXYZ(brect.rad.x, brect.rad.y, 1));
    cuboid.transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, 1));
    for (var i = 0; i < cuboid.vertexes.length; i++) {
      cuboid.vertexes[i].setColorArray(this.blockColor);
    }
    labelModel.addRigidModel(cuboid);
    labelModel.transformPositions(new Matrix44().toTranslateOpXYZ(0, 0, -1));
  }

  var b = Body.alloc();
  b.shape = Body.Shape.RECT;
  var pos = new Vec2d(x, y);
  b.setPosAtTime(pos, this.world.now);
  b.rectRad.set(brect.rad);
  b.group = 0;
  b.mass = Infinity;
  b.pathDurationMax = Infinity;
  var spirit = new ButtonSpirit();
  spirit.bodyId = this.world.addBody(b);
  spirit.setMultiPointer(this.multiPointer);
  spirit.setModelStamp(labelModel.createModelStamp(this.renderer.gl));
  spirit.setOnClick(func);
  return this.world.addSpirit(spirit);
};
