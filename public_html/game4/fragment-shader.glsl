// Special rendering type:
// 0: none
// 1: circle cut-off
// 2: polyline
uniform lowp int uType;

uniform highp float uTime;

uniform lowp int uCircleCount; // 1 to 8
uniform lowp vec3 uCircles[8];

varying lowp vec4 vColor;
varying mediump vec2 vPosReal;
varying mediump vec2 vPosWarped;

uniform lowp int uTexture;

int TEXTURE_NONE = 0;
int TEXTURE_WALL = 1;


highp float rand(highp float i) {
  return fract(sin(i) * 9754.312);
}

void main(void) {
  if (uType == 1) {
    // circle mode!
    lowp float minDist = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i < uCircleCount) {
        lowp vec3 circle = uCircles[i];
        lowp vec2 circlePos = circle.xy;
        lowp float circleRad = circle.z;
        minDist = min(minDist, distance(vPosWarped, circlePos) / circleRad);
      }
    }
    if (minDist < 0.87) {
      gl_FragColor = vColor;
    } else if (minDist < 1.0) {
      gl_FragColor = vColor * 0.6;
    } else {
      //discard;
      gl_FragColor.xyz *= 0.0;
    }
  } else {
    // normal or polyline - simple
    gl_FragColor = vColor;
  }

//  if (uTexture == TEXTURE_WALL) {
//    lowp float s = 0.5;
//    highp vec2 c = vec2(
//        floor((vPosReal.x) / s + 0.5) * s,
//        floor((vPosReal.y) / s + 0.5) * s);
//
//    highp float x = dot(c, vec2(13.987, 73.123)) + uTime / 321.;
//    lowp float i = floor(x);
//    lowp float f = fract(x);
//    lowp float n = mix(rand(i), rand(i + 1.0), smoothstep(0.,1.,f));
//
//    lowp float density = 0.05;
//    lowp float brightness = 0.5;
//    lowp float merp = smoothstep(0.0, 1.0, abs(n / density - 0.5) * 2.0) * brightness;
//    gl_FragColor.y += brightness - merp;
//    gl_FragColor.z += brightness - merp;
//  }
}
