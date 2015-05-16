/**
 * @constructor
 * @extends {Spirit}
 */
function ButtonSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.multiPointer = null;
  this.color = new Vec4();
  this.rand = Math.random();
}
ButtonSpirit.prototype = new Spirit();
ButtonSpirit.prototype.constructor = ButtonSpirit;

ButtonSpirit.POINTER_RADIUS = 0.5;

ButtonSpirit.prototype.setMultiPointer = function (multiPointer) {
  this.multiPointer = multiPointer;
};

ButtonSpirit.prototype.onDraw = function(world, renderer) {
  var t = 0.5 * world.now + 2 * Math.PI * this.rand;
  var b = world.bodies[this.bodyId];
  b.getPosAtTime(world.now, bodyPos);
  this.color.setXYZ(0.5, 0.5, 0.5);
  if (this.multiPointer) {
    for (var key in this.multiPointer.pos) {
      var pointerPos = this.multiPointer.pos[key];
      if (OverlapDetector.isRectOverlappingCircle(bodyPos, b.rectRad, pointerPos, ButtonSpirit.POINTER_RADIUS)) {
        this.color.setXYZ(
                0.5 + 0.25 * Math.sin(t),
                0.5 + 0.25 * Math.sin(2 * Math.PI / 3 + t),
                0.5 + 0.25 * Math.sin(4 * Math.PI / 3 + t));
        var mass = b.rectRad.x * b.rectRad.y;
        sound.sound(0, 0, 0, 0.25, 0.01, 0.2, 0.01, 500/mass, 500/mass + 20*Math.random(), 'sine');
        break;
      }
    }
  }
  renderer
      .setStamp(stamps.cube)
      .setColorVector(this.color);
  modelMatrix.toTranslateOp(vec4.setXYZ(bodyPos.x, bodyPos.y, 0));
  modelMatrix.multiply(mat4.toScaleOp(vec4.setXYZ(b.rectRad.x, b.rectRad.y, 1)));
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
};
