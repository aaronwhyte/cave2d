uniform vec3 uTranslation;
uniform vec3 uScale;
uniform vec3 uPlayerPos;

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

varying lowp vec4 vColor;

void main(void) {
  gl_Position = vec4((aVertexPosition + uTranslation) * uScale, 1.0);
  vColor = aVertexColor + (gl_Position - vec4(uPlayerPos * uScale, 1.0)) * 2.0;
}
