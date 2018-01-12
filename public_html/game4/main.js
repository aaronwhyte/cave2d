// global entry point for debugging
let app;

function main() {
  let basePath = ['game4'];
  app = new PlayApp('Game 4', basePath,
      'vertex-shader.glsl', 'fragment-shader.glsl',
      'adventures/shorttest8.txt',
      PlayLevelPage);
  app.start();
}

