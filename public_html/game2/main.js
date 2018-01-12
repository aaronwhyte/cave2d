let app;

function main() {
  let basePath = ['game2'];
  app = new PlayApp('Game 2', basePath,
      'vertex-shader.txt', 'fragment-shader.txt',
      'adventures/splendid6.txt',
      PlayLevelPage);
  app.start();
}

