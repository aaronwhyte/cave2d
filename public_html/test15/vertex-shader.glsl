uniform vec3 uViewTranslation;
uniform vec3 uViewScale;
uniform vec3 uModelScale;
uniform vec3 uModelTranslation;
uniform vec3 uModelColor;
uniform vec3 uPlayerPos;

attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

varying lowp vec4 vColor;

void main(void) {
  gl_Position = vec4((aVertexPosition * uModelScale + uModelTranslation + uViewTranslation) * uViewScale, 1.0);
  vColor = aVertexColor * vec4(uModelColor, 1.0) + (gl_Position - vec4(uPlayerPos * uViewScale, 1.0)) * 0.3;
}
