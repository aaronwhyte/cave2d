uniform lowp int uBatching;

uniform mat4 uViewMatrix;

uniform mat4 uModelMatrix;
uniform mat4 uModelMatrix2;
uniform vec4 uModelColor;

const int BATCH_SIZE = 10;
uniform mat4 uModelMatrixBatch[BATCH_SIZE];
uniform mat4 uModelMatrix2Batch[BATCH_SIZE];
uniform vec4 uModelColorBatch[BATCH_SIZE];

attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;
attribute lowp float aVertexGroup;
attribute lowp float aVertexInstance;

varying lowp vec4 vColor;
varying mediump vec2 vPosReal;
varying mediump vec2 vPosWarped;

void main(void) {
  if (uBatching == 1) {
    int instance = int(aVertexInstance);
    mat4 iModelMatrix = uModelMatrixBatch[instance];
    mat4 iModelMatrix2 = uModelMatrix2Batch[instance];
    vec4 iModelColor = uModelColorBatch[instance];

    if (aVertexGroup == 0.0) {
      gl_Position = aVertexPosition * iModelMatrix;
      vPosReal = (aVertexPosition * iModelMatrix).xy;
    } else {
      gl_Position = aVertexPosition * iModelMatrix2;
      vPosReal = (aVertexPosition * iModelMatrix2).xy;
    }
    vPosWarped = gl_Position.xy;
    gl_Position *= uViewMatrix;
    vColor = aVertexColor * iModelColor;
    vColor = aVertexColor * iModelColor;
  } else {
    if (aVertexGroup == 0.0) {
      gl_Position = aVertexPosition * uModelMatrix;
      vPosReal = (aVertexPosition * uModelMatrix).xy;
    } else {
      gl_Position = aVertexPosition * uModelMatrix2;
      vPosReal = (aVertexPosition * uModelMatrix2).xy;
    }
    vPosWarped = gl_Position.xy;
    gl_Position *= uViewMatrix;
    vColor = aVertexColor * uModelColor;
  }
}
