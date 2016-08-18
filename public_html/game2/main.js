var app;
function main() {
  var basePath = ['game2'];
  app = new PlayApp('Game 2', basePath,
      'adventures/splendid6.txt',
      'vertex-shader.txt', 'fragment-shader.txt',
      PlayLevelPage);
  app.start();
}

