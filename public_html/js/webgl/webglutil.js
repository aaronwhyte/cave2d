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
 * Creates and compiles a shader.
 * @param {!WebGLRenderingContext} gl
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, gl.VERTEX_SHADER or
 *     gl.FRAGMENT_SHADER.
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

/**
 * @param {!WebGLRenderingContext} gl
 * @param values
 * @returns {WebGLBuffer}
 */
function createStaticGlBuff(gl, values) {
  var buff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
  return buff;
}

// Make WebStorm 8 happy
if (!'WebGLRenderingContext' in window) {
  throw 'WebGLRenderingContext undefined!';
  (function(){
    var f = function(){};
    window.WebGLRenderingContext = {
      WebGLBuffer: {},
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
      ELEMENT_ARRAY_BUFFER: 1,
      bindBuffer: f,
      bufferData: f,
      COLOR_BUFFER_BIT: 1,
      DEPTH_BUFFER_BIT: 1,
      FLOAT: 1,
      UNSIGNED_SHORT: 1,
      TRIANGLES: 1,
      TRIANGLE_STRIP: 1,
      TRIANGLE_FAN: 1,
      vertexAttribPointer: f,
      drawArrays: f,
      drawElements: f,
      STATIC_DRAW: 1,
      DYNAMIC_DRAW: 1,
      STREAM_DRAW: 1,
      uniform4f: f,
      uniform3fv: f,
      uniform1i: f,
      uniform1f: f


    };

    window.WebGLShader = f;
    window.WebGLProgram = f;
  })();
}
