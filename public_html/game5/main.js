// global entry point for debugging
let app;

function main() {
  let basePath = ['game5'];
  app = new PlayApp('Game 5', basePath,
      'vertex-shader.glsl', 'fragment-shader.glsl',
      'adventures/shorttest8.txt',
      PlayLevelPage);
  app.start();
}

