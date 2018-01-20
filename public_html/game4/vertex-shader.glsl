// Special rendering type:
// 0: none
// 1: circle cut-off
// 2: polyline
uniform lowp int uType;

uniform lowp int uBatching;

//uniform highp float uTime;

uniform mat4 uViewMatrix;

uniform mat4 uModelMatrix;
uniform mat4 uModelMatrix2;
uniform vec4 uModelColor;

const int BATCH_SIZE = 10;
uniform mat4 uModelMatrixBatch[BATCH_SIZE];
uniform mat4 uModelMatrix2Batch[BATCH_SIZE];
uniform vec4 uModelColorBatch[BATCH_SIZE];

//// poly-line uses a circular buffer with alternating x and y values
//const int POLY_LINE_DATA_LENGTH = 40 * 2;
//const float F_POLY_LINE_DATA_LENGTH = 40.0 * 2.0;
//uniform float uPolyLineData[POLY_LINE_DATA_LENGTH];
//uniform float uPolyLineHeadIndex;
//uniform float uPolyLinePointCount;
//
//uniform int uWarpType[8];
//uniform vec4 uWarpData[8];

attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;
attribute lowp float aVertexGroup;
attribute lowp float aVertexInstance;

varying lowp vec4 vColor;
varying mediump vec2 vPosReal;
varying mediump vec2 vPosWarped;


void main(void) {
//  if (uType == 0 || uType == 1) {
    // normal mode or circle-clip mode - they're the same for the vertex shader

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

//    vec2 distort = vec2(0, 0);
//
//    for (int i = 0; i < 8; i++) {
//      int warpType = uWarpType[i];
//      vec4 warpData = uWarpData[i];
//      vec2 warpPos = warpData.xy;
//
//      if (warpType == 1) {
//        // repel
//        float vertDist = distance(gl_Position.xy, warpPos);
//        float warpRad = warpData[2];
//        if (vertDist <= warpRad && vertDist > 0.0) {
//          float strength = warpData[3];
//          float repelMagnitude = max(-1.0, (warpRad - vertDist) * strength / vertDist);
//          distort += (gl_Position.xy - warpPos) * repelMagnitude;
//        }
//
//      } else if (warpType == 2) {
//        // quantize
//        float vertDist = distance(gl_Position.xy, warpPos);
//        float warpRad = warpData[2];
//        if (vertDist <= warpRad && vertDist > 0.0) {
//          float chunk = warpData[3];
//          distort += floor((gl_Position.xy - warpPos) * chunk + vec2(0.5, 0.5)) / chunk - gl_Position.xy + warpPos;
//        }
//
//      } else if (warpType == 3) {
//        // flower
//        float vertDist = distance(gl_Position.xy, warpPos);
//        vec2 tip = vec2(warpData[2], warpData[3]);
//        float warpRad = length(tip);
//        if (vertDist <= warpRad && vertDist > 0.0) {
//          float angle = atan(tip.y, tip.x) - atan(warpPos.y - gl_Position.y, warpPos.x - gl_Position.x);
//          vec2 unit = (gl_Position.xy - warpPos)/warpRad;
//          distort += 0.5 * warpRad * unit * (0.5 + (0.5 - vertDist/warpRad)) * sin(angle*7.0);
//        }
//
//      } else if (warpType == 4) {
//        // invert circle
//        float circleSize = warpData[2];
//        float vertDistFrac = distance(gl_Position.xy, warpPos) / circleSize;
//        vec2 relPos = gl_Position.xy - warpPos;
//        if (vertDistFrac > 0.0) {
//          vec2 newRelPos;
//          if (vertDistFrac < 1.0) {
//            newRelPos = circleSize * relPos / length(relPos);
//          } else {
//            newRelPos = relPos / (vertDistFrac * vertDistFrac);
//          }
//          distort += newRelPos - relPos;
//        }
//      }
//    }
//    gl_Position.xy += distort;

//  } else if (uType == 2) {
//    // polyline mode!
//
//    float fPointNum = min(aVertexPosition.z, uPolyLinePointCount - 2.0);
//
//    float fP0Index = uPolyLineHeadIndex - 2.0 * fPointNum;
//    // If fP0Index is less than 0, then this will add F_POLY_LINE_DATA_LENGTH to it
//    // to get it back in range, without an "if".
//    fP0Index -= floor(fP0Index / F_POLY_LINE_DATA_LENGTH) * F_POLY_LINE_DATA_LENGTH;
//    int p0Index = int(fP0Index);
//
//    float fP1Index = uPolyLineHeadIndex - 2.0 * (fPointNum + 1.0);
//    // ditto
//    fP1Index -= floor(fP1Index / F_POLY_LINE_DATA_LENGTH) * F_POLY_LINE_DATA_LENGTH;
//    int p1Index = int(fP1Index);
//
//    highp vec2 p0 = vec2(uPolyLineData[p0Index - 1], uPolyLineData[p0Index]);
//    highp vec2 p1 = vec2(uPolyLineData[p1Index - 1], uPolyLineData[p1Index]);
//    float signX = sign(aVertexPosition.x);
//
//    // prepare to scale by line width
//    highp vec2 addForWidth = vec2(aVertexPosition.xy);
//    addForWidth.x -= signX;
//    addForWidth *= 1.5; // optional line thickener
//
////    // rotate by the angle measured in graph space
////    // BUG doesn't work on old iPads for some reason. And I don't really need it.
////    highp vec4 g0;
////    g0.xy = p0.xy;
////    g0 *= uModelMatrix;
////    highp vec4 g1;
////    g1.xy = p1.xy;
////    g1 *= uModelMatrix;
////    highp float angle = atan(g1.y - g0.y, g1.x - g0.x);
////    highp float s = sin(angle);
////    highp float c = cos(angle);
////    highp mat2 rot = mat2(c, -s, s, c);
////    addForWidth *= rot;
//
//    // set to whichever point it is
//    gl_Position = aVertexPosition;
//    gl_Position.xy = (p1.xy * (signX + 1.0) / 2.0) - (p0.xy * (signX - 1.0) / 2.0);
//    gl_Position *= uModelMatrix;
//    gl_Position.xy += addForWidth;
//    gl_Position *= uViewMatrix;
//    gl_Position.z = -0.99;
//    vColor = aVertexColor * uModelColor;
//  }

}
