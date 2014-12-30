/**
 * The renderer owns the shaders and the sparks.
 * It has read-access to the world's bodies.
 * @param canvas
 * @param gl
 * @param program
 * @constructor
 */
function Renderer(canvas, gl, program) {
  this.canvas = canvas;
  this.gl = gl;
  this.program = program;

  this.viewScale = [1, 1, 1];
  this.viewTranslation = [0, 0, 0];
  this.zoom = 1/200;

  this.initAttributesAndUniforms();
}


var ZERO_3 = [0, 0, 0];
var IDENTITY_3 = [1, 1, 1];
var PLAYER_COLOR_3 = [1, 0.5, 0.5];
var RAY_SPIRIT_COLOR_3 = [0.2, 0.7, 0.8];
var BULLET_COLOR_3 = [1, 0.5, 0.1];
var OTHER_COLOR_3 = [0.5, 1, 0.5];



Renderer.prototype.initAttributesAndUniforms = function() {
  var gl = this.gl;
  var program = this.program;
  var self = this;

  // Attributes
  function attribute(name) {
    self[name] = gl.getAttribLocation(program, name);
  }
  attribute('aVertexPosition');
  gl.enableVertexAttribArray(this.aVertexPosition);
  attribute('aVertexColor');
  gl.enableVertexAttribArray(this.aVertexColor);

  // Uniforms
  function uniform(name) {
    self[name] = gl.getUniformLocation(program, name);
  }
  uniform('uViewTranslation');
  uniform('uViewScale');
  uniform('uModelTranslation');
  uniform('uModelScale');
  uniform('uModelColor');
  uniform('uType');
  uniform('uTime');
};


Renderer.prototype.maybeResize = function() {
  if (this.canvas.width != this.canvas.clientWidth ||
      this.canvas.height != this.canvas.clientHeight) {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
};


Renderer.prototype.drawScene = function(world) {
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

//  // Center the view on the player.
//  readPlayerPos();
//  viewTranslation[0] = -playerPos.x - 0.25 - playerBody.vel.x / 10;
//  viewTranslation[1] = -playerPos.y - 0.25 - playerBody.vel.y / 10;
//  viewTranslation[2] = 0;
  this.gl.uniform3fv(this.uViewTranslation, this.viewTranslation);

  // Scale the view to encompass a fixed-size square around the player's position.
  var edgeLength = Math.min(this.canvas.width, this.canvas.height);
  this.viewScale[0] = this.zoom * edgeLength / this.canvas.width;
  this.viewScale[1] = this.zoom * edgeLength / this.canvas.height;
  this.viewScale[2] = 1;
  this.gl.uniform3fv(this.uViewScale, this.viewScale);

  this.drawBackground();
  // TODO: foreground!
};

Renderer.prototype.drawBackground = function() {
  // Draw the whole background.
  // All the vertex data is already in the program, in bgColorBuff and bgPosBuff.
  // Since the map is already in world-coordinates and world-colors,
  // set all the model-to-world uniforms to do nothing.
  this.gl.uniform3fv(this.uModelScale, IDENTITY_3);
  this.gl.uniform3fv(this.uModelTranslation, ZERO_3);
  this.gl.uniform3fv(this.uModelColor, IDENTITY_3);
  this.gl.uniform1i(this.uType, 0);
  drawTriangles(this.gl, this.aVertexPosition, this.aVertexColor,
      this.bgPosBuff, this.bgColorBuff, this.bgTriangleCount);
};

Renderer.prototype.setBackgroundTriangleVertexes = function(positionBuff, colorBuff, triangleCount) {
  this.bgPosBuff = positionBuff;
  this.bgColorBuff = colorBuff;
  this.bgTriangleCount = triangleCount;
};

//function drawScene() {
//
//  // foreground
//  for (var id in world.bodies) {
//    var b = world.bodies[id];
//    if (b && b.mass != Infinity) {
//      drawBody(b);
//    }
//  }
//}
//
//function drawBody(b) {
//  b.getPosAtTime(world.now, bodyPos);
//  array3[0] = bodyPos.x;
//  array3[1] = bodyPos.y;
//  array3[2] = 0;
//  gl.uniform3fv(uModelTranslation, array3);
//
//  if (b.id == playerSpirit.bodyId) {
//    gl.uniform3fv(uModelColor, PLAYER_COLOR_3);
//  } else if (b.id == raySpirit.bodyId) {
//    gl.uniform3fv(uModelColor, RAY_SPIRIT_COLOR_3);
//  } else if (world.spirits[world.bodies[b.id].spiritId] instanceof BulletSpirit) {
//    gl.uniform3fv(uModelColor, BULLET_COLOR_3);
//  } else {
//    gl.uniform3fv(uModelColor, OTHER_COLOR_3);
//  }
//
//  if (b.shape === Body.Shape.RECT) {
//    array3[0] = b.rectRad.x;
//    array3[1] = b.rectRad.y;
//    array3[2] = 1;
//    gl.uniform3fv(uModelScale, array3);
//    gl.uniform1i(uType, 0);
//    drawTriangles(gl, rectPosBuff, rectColorBuff, 2);
//
//  } else if (b.shape === Body.Shape.CIRCLE) {
//    array3[0] = b.rad;
//    array3[1] = b.rad;
//    array3[2] = 1;
//    gl.uniform3fv(uModelScale, array3);
//    // Explosions!
//    gl.uniform1i(uType, 2);
//    var t = (world.now / (15 + (b.id % 100)/10)) % 1;
//    gl.uniform1f(uTime, t);
//    drawTriangleFan(gl, circlePosBuffs[CIRCLE_CORNERS], circleColorBuffs[CIRCLE_CORNERS], CIRCLE_CORNERS);
//  }
//}
//
