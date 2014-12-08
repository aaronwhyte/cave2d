/**
 * Gets a WebGL context from a canvas
 * @param canvas
 * @param paramObj
 * @return {WebGLRenderingContext}
 */
function getWebGlContext(canvas, paramObj) {
  if (paramObj) {
    return canvas.getContext('experimental-webgl', paramObj) || canvas.getContext('webgl', paramObj);
  } else {
    return canvas.getContext('experimental-webgl') || canvas.getContext('webgl');
  }
}

/**
 * Creates a program from 2 script tags
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} vertexShaderId  vertex shader script tag ID
 * @param {string} fragmentShaderId  fragment shader script tag ID
 * @return {!WebGLProgram}
 */
function createProgramFromScripts(gl, vertexShaderId, fragmentShaderId) {
  var vertexShader = createShaderFromScript(gl, vertexShaderId, gl.VERTEX_SHADER);
  var fragmentShader = createShaderFromScript(gl, fragmentShaderId, gl.FRAGMENT_SHADER);
  return createProgram(gl, vertexShader, fragmentShader);
}


/**
 * Creates a shader from the content of a script tag.
 * @param {!WebGLRenderingContext} gl
 * @param {string} scriptId
 * @param {number} shaderType  gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @return {!WebGLShader}
 */
function createShaderFromScript(gl, scriptId, shaderType) {
  var shaderScript = document.getElementById(scriptId);
  var shaderSource = shaderScript.text;
  return compileShader(gl, shaderSource, shaderType);
}


/**
 * Creates and compiles a shader.
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, VERTEX_SHADER or
 *     FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
function compileShader(gl, shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }
  return shader;
}


/**
 * Creates a program from 2 shaders.
 * @param {!WebGLRenderingContext} gl
 * @param {!WebGLShader} vertexShader
 * @param {!WebGLShader} fragmentShader
 * @return {!WebGLProgram}
 */
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw 'program filed to link:' + gl.getProgramInfoLog(program);
  }
  return program;
}


// Make WebStorm 8 happy
if (!'WebGLRenderingContext' in window) {
  throw 'WebGLRenderingContext undefined!';
  (function(){
    var f = function(){};
    window.WebGLRenderingContext = {
      createShader: f,
      shaderSource: f,
      compileShader: f,
      COMPILE_STATUS: 1,
      getShaderParameter: f,
      getShaderInfoLog: f,
      createProgram: f,
      attachShader: f,
      linkProgram: f,
      getProgramParameter: f,
      getProgramInfoLog: f,
      LINK_STATUS: 1,
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 1,
      useProgram: f,

      clearColor: f,
      enable: f,
      DEPTH_TEST: 1,
      getAttribLocation: f,
      enableVertexAttribArray: f,
      getUniformLocation: f,
      uniformMatrix4fv: f,
      createBuffer: f,
      ARRAY_BUFFER: 1,
      bindBuffer: f,
      bufferData: f,
      COLOR_BUFFER_BIT: 1,
      DEPTH_BUFFER_BIT: 1,
      FLOAT: 1,
      TRIANGLES: 1,
      TRIANGLE_STRIP: 1,
      TRIANGLE_FAN: 1,
      vertexAttribPointer: f,
      drawArrays: f,
      STATIC_DRAW: 1,
      DYNAMIC_DRAW: 1,
      STREAM_DRAW: 1,
      uniform4f: f,
      uniform3fv: f
    };

    window.WebGLShader = f;
    window.WebGLProgram = f;
  })();
}
