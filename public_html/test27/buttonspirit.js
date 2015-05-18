/**
 * @constructor
 * @extends {Spirit}
 */
function ButtonSpirit() {
  Spirit.call(this);
  this.bodyId = -1;
  this.id = -1;
  this.multiPointer = null;
  this.modelStamp = null;

  this.color = new Vec4();
  this.lastSoundMs = 0;
  this.soundLength = 1;
}
ButtonSpirit.prototype = new Spirit();
ButtonSpirit.prototype.constructor = ButtonSpirit;

ButtonSpirit.POINTER_RADIUS = 0;

ButtonSpirit.prototype.setMultiPointer = function(multiPointer) {
  this.multiPointer = multiPointer;
};

ButtonSpirit.prototype.setModelStamp = function(modelStamp) {
  this.modelStamp = modelStamp;
};

ButtonSpirit.prototype.onDraw = function(world, renderer) {
  var b = world.bodies[this.bodyId];
  var mass = b.rectRad.x * b.rectRad.y;
  b.getPosAtTime(world.now, bodyPos);
  if (this.multiPointer) {
    for (var key in this.multiPointer.pos) {
      var oldPointerPos = this.multiPointer.oldPos[key];
      var pointerPos = this.multiPointer.pos[key];
      if (OverlapDetector.isRectOverlappingCircle(bodyPos, b.rectRad, pointerPos, ButtonSpirit.POINTER_RADIUS)
          && !(false && oldPointerPos && OverlapDetector.isRectOverlappingCircle(bodyPos, b.rectRad, oldPointerPos, ButtonSpirit.POINTER_RADIUS))) {
        vec4.setXYZ(bodyPos.x, bodyPos.y, 0);
        vec4.transform(renderer.getViewMatrix());
        var freq = 200/(mass);
        sound.sound(vec4.v[0], vec4.v[1], 0, 0.4, 0, 4/60, 30/60, freq, freq + 10*Math.random(), 'square');
        sound.sound(vec4.v[0], vec4.v[1], 0, 0.3, 0, 4/60, 30/60, freq/2, freq/2 + 10*Math.random(), 'sine');
        this.lastSoundMs = Date.now();
        this.soundLength = (0.01 + 4/60 + 30/60) * 1000;
        break;
      }
    }
  }
  var life = 0;
  if (Date.now() - this.lastSoundMs < this.soundLength) {
    life = 1 - (Date.now() - this.lastSoundMs) / this.soundLength;
    this.color.setXYZ(
            0.5 + life * 0.5 * Math.sin(0),
            0.5 + life * 0.5 * Math.sin(2*Math.PI/3),
            0.5 + life * 0.5 * Math.sin(2*2*Math.PI/3));
  } else {
    this.color.setXYZ(0.5, 0.5, 0.5);
  }
  renderer
      .setStamp(this.modelStamp)
      .setColorVector(this.color);
  modelMatrix.toTranslateOpXYZ(bodyPos.x, bodyPos.y, 0);
  modelMatrix.multiply(mat4.toScaleOpXYZ(b.rectRad.x, b.rectRad.y, 1+life));
  renderer.setModelMatrix(modelMatrix);
  renderer.drawStamp();
};
