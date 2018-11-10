// global entry point for debugging
let app;

function main() {
  let basePath = ['game5'];
  app = new PlayApp('Game 5', basePath,
      'graphics/shaders/vertex-shader.glsl', 'graphics/shaders/fragment-shader.glsl',
      'adventures/done20181110.json',
      PlayLevelPage);
  app.start();
}

