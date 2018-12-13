// Special rendering type:
// 0: none
// 1: circle cut-off
// 2: polyline
uniform lowp int uType;

uniform mediump float uTime;

uniform lowp int uCircleCount; // 1 to 8
uniform lowp vec3 uCircles[8];

varying lowp vec4 vColor;
varying mediump vec4 vPosReal;
varying mediump vec4 vPosWarped;

//uniform lowp int uTexture;
//
//int TEXTURE_NONE = 0;
//int TEXTURE_WALL = 1;


//highp float rand(highp float i) {
//  return fract(sin(i) * 9754.312);
//}

void main(void) {
  if (uType == 1 || uType == 4) {
    // circle mode! (or batch mode which still uses circles but I should separate them maybe)
    lowp float minDist = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i < uCircleCount) {
        lowp vec3 circle = uCircles[i];
        lowp vec2 circlePos = circle.xy;
        lowp float circleRad = circle.z;
        minDist = min(minDist, distance(vPosWarped.xy, circlePos) / circleRad);
      }
    }
    if (minDist < 0.87) {
      gl_FragColor = vColor;
    } else if (minDist < 1.0) {
      gl_FragColor = vColor * 0.6;
    } else {
      // discard;
      gl_FragColor.xyz *= 0.0;
    }
  } else {
    // normal or polyline - simple

//    gl_FragColor = vColor;

//    gl_FragColor.xyz = vColor.xyz
//        * (0.6 + 0.4 * (1.0 + sin((0.1*uTime + vPosWarped.z*5.0) * 2.0)))
//        * (0.6 + 0.4 * (-vPosWarped.z / 15.0 + 0.5));

    gl_FragColor = vColor;
  }
    // Things further back are dimmer
  gl_FragColor *= 0.6 - vPosWarped.z * 0.3;

}
