// global entry point for debugging
let app;

function main() {
  let basePath = ['game6'];
  app = new PlayApp('Game 6', basePath,
      'graphics/shaders/vertex-shader.glsl', 'graphics/shaders/fragment-shader.glsl',
      'adventures/test1.json',
      PlayLevelPage);
  app.start();
}

